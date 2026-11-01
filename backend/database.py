import os
import threading

import psycopg2
from psycopg2 import pool
from dotenv import load_dotenv

load_dotenv()


# =====================================================
# CONNECTION POOL
# =====================================================
# Opening a new PostgreSQL connection on every request is slow
# (TCP + TLS + auth, often 100-500 ms on a hosted database).
# Connections are now created once and re-used.
# get_db_connection() still returns an object that behaves like a
# normal psycopg2 connection, and close() simply returns it to the
# pool, so no route code needs to change.

_POOL_MIN = 1
_POOL_MAX = 10

_pool = None
_pool_lock = threading.Lock()


def _database_url():
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise ValueError("DATABASE_URL is not configured")

    return database_url


def _new_raw_connection():
    return psycopg2.connect(
        _database_url(),
        keepalives=1,
        keepalives_idle=30,
        keepalives_interval=10,
        keepalives_count=3,
    )


def _get_pool():
    global _pool

    if _pool is None:
        with _pool_lock:
            if _pool is None:
                _pool = pool.ThreadedConnectionPool(
                    _POOL_MIN,
                    _POOL_MAX,
                    _database_url(),
                    keepalives=1,
                    keepalives_idle=30,
                    keepalives_interval=10,
                    keepalives_count=3,
                )

    return _pool


class PooledConnection:
    """Thin wrapper: behaves like a psycopg2 connection, but close()
    gives the connection back to the pool instead of closing it."""

    def __init__(self, raw, owner_pool):
        self._raw = raw
        self._pool = owner_pool
        self._released = False

    def __getattr__(self, name):
        return getattr(self._raw, name)

    def close(self):
        if self._released:
            return

        self._released = True

        try:
            if self._raw.closed:
                # Broken connection: drop it.
                self._pool.putconn(self._raw, close=True)
                return

            # Never hand back a connection with an open transaction.
            if self._raw.status != psycopg2.extensions.STATUS_READY:
                self._raw.rollback()

            self._pool.putconn(self._raw)

        except Exception:
            try:
                self._pool.putconn(self._raw, close=True)
            except Exception:
                pass


def get_db_connection():
    owner_pool = _get_pool()

    # Try a few times in case an idle pooled connection went stale.
    for _ in range(3):
        try:
            raw = owner_pool.getconn()
        except pool.PoolError:
            # Pool exhausted: fall back to a normal one-off connection.
            return _new_raw_connection()

        if raw.closed:
            owner_pool.putconn(raw, close=True)
            continue

        try:
            if raw.status != psycopg2.extensions.STATUS_READY:
                raw.rollback()
        except Exception:
            owner_pool.putconn(raw, close=True)
            continue

        return PooledConnection(raw, owner_pool)

    return _new_raw_connection()

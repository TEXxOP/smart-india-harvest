from sqlmodel import create_engine, SQLModel, Session
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError(
        "DATABASE_URL not set. Locally: put it in backend/.env "
        "(see .env.example). On Render: add it under the service's "
        "Environment tab before deploying."
    )

# Handle Render/Neon specific postgresql:// vs postgres://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# SQL echo is deafening in production logs and prints row values; keep it opt-in.
SQL_ECHO = os.getenv("SQL_ECHO", "false").lower() in ("1", "true", "yes")

engine = create_engine(
    DATABASE_URL,
    echo=SQL_ECHO,
    # Neon drops idle connections, and a free Render instance sleeps after 15
    # minutes. Without pre_ping the first query after either event fails with
    # "server closed the connection unexpectedly"; with it the dead connection
    # is discarded and retried transparently.
    pool_pre_ping=True,
    pool_recycle=280,
    pool_size=5,
    max_overflow=2,
)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session

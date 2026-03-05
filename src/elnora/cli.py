"""Elnora CLI — entry point and global flags."""

from __future__ import annotations

import json
import sys

from .lib.errors import scrub


def _crash_handler(exc_type, exc_value, exc_tb):
    """Global crash handler — structured JSON to stderr, never raw stack traces."""
    if issubclass(exc_type, (SystemExit, KeyboardInterrupt)):
        sys.__excepthook__(exc_type, exc_value, exc_tb)
        return
    payload = {"error": scrub(str(exc_value)), "type": exc_type.__name__}
    print(json.dumps(payload, indent=2), file=sys.stderr)
    sys.exit(1)


sys.excepthook = _crash_handler

import click  # noqa: E402

from .commands.auth import auth  # noqa: E402
from .commands.completion import completion  # noqa: E402
from .commands.files import files  # noqa: E402
from .commands.projects import projects  # noqa: E402
from .commands.search import search  # noqa: E402
from .commands.tasks import tasks  # noqa: E402


@click.group()
@click.version_option(package_name="elnora")
@click.option("--compact", is_flag=True, help="Token-efficient minimal output.")
@click.option(
    "--output",
    "fmt",
    type=click.Choice(["json", "csv"]),
    default="json",
    help="Output format.",
)
@click.option("--fields", default=None, help="Comma-separated fields to include.")
@click.pass_context
def cli(ctx, compact, fmt, fields):
    """Elnora AI Platform CLI.

    \b
    Getting started:
      1. Get an API key from https://platform.elnora.ai > Settings > API Keys
      2. Run: elnora auth login
      3. Try:  elnora projects list
    """
    ctx.ensure_object(dict)
    ctx.obj["compact"] = compact
    ctx.obj["fmt"] = fmt
    ctx.obj["fields"] = [f.strip() for f in fields.split(",") if f.strip()] if fields else None


cli.add_command(auth)
cli.add_command(completion)
cli.add_command(files)
cli.add_command(projects)
cli.add_command(search)
cli.add_command(tasks)


def main():
    cli()


if __name__ == "__main__":
    main()

"""Elnora CLI — entry point and global flags."""

import json
import sys

from .lib.errors import _EXIT_CODES, ElnoraError, scrub


def _crash_handler(exc_type, exc_value, exc_tb):
    """Global crash handler — structured JSON to stderr, never raw stack traces."""
    if issubclass(exc_type, (SystemExit, KeyboardInterrupt)):
        sys.__excepthook__(exc_type, exc_value, exc_tb)
        return
    error_msg = scrub(str(exc_value))
    if isinstance(exc_value, ElnoraError):
        payload = {"error": error_msg, "code": exc_value.code}
        if exc_value.suggestion:
            payload["suggestion"] = exc_value.suggestion
        exit_code = _EXIT_CODES.get(type(exc_value), 1)
    else:
        payload = {"error": error_msg, "code": "INTERNAL_ERROR"}
        exit_code = 1
    print(json.dumps(payload, indent=2), file=sys.stderr)
    sys.exit(exit_code)


sys.excepthook = _crash_handler

import click  # noqa: E402

from .commands.account import account  # noqa: E402
from .commands.api_keys import api_keys  # noqa: E402
from .commands.audit import audit  # noqa: E402
from .commands.auth import auth  # noqa: E402
from .commands.completion import completion  # noqa: E402
from .commands.feedback import feedback  # noqa: E402
from .commands.files import files  # noqa: E402
from .commands.flags import flags  # noqa: E402
from .commands.folders import folders  # noqa: E402
from .commands.health import health  # noqa: E402
from .commands.library import library  # noqa: E402
from .commands.orgs import orgs  # noqa: E402
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
@click.option("--profile", default=None, help="Named profile to use (default: 'default').")
@click.option("--org", default=None, hidden=True, help="[DEPRECATED] Organization UUID — ignored for API key auth.")
@click.pass_context
def cli(ctx, compact, fmt, fields, profile, org):
    """Elnora AI Platform CLI.

    \b
    Getting started:
      1. Get an API key from https://platform.elnora.ai > Settings > API Keys
      2. Run: elnora auth login
      3. Try:  elnora projects list

    \b
    Multi-org setup:
      elnora auth login --profile university
      elnora --profile university projects list
    """
    ctx.ensure_object(dict)
    ctx.obj["compact"] = compact
    ctx.obj["fmt"] = fmt
    ctx.obj["fields"] = [f.strip() for f in fields.split(",") if f.strip()] if fields else None
    ctx.obj["profile"] = profile

    # Set active profile so ElnoraClient.from_env() picks it up
    if profile:
        from .lib.client import ElnoraClient

        ElnoraClient._active_profile = profile

    if org:
        from .lib.errors import output_warning

        output_warning(
            "--org is deprecated and has no effect with API key auth. "
            "Use --profile instead to switch between organizations.",
            code="DEPRECATED_FLAG",
        )


cli.add_command(account)
cli.add_command(api_keys)
cli.add_command(audit)
cli.add_command(auth)
cli.add_command(completion)
cli.add_command(feedback)
cli.add_command(files)
cli.add_command(flags)
cli.add_command(folders)
cli.add_command(health)
cli.add_command(library)
cli.add_command(orgs)
cli.add_command(projects)
cli.add_command(search)
cli.add_command(tasks)


def main():
    import atexit

    from .lib.update_check import check_for_update

    atexit.register(check_for_update)
    cli()


if __name__ == "__main__":
    main()

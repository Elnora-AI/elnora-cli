"""Feedback commands — submit feedback to the Elnora team."""

from __future__ import annotations

import click

from ..lib.client import ElnoraClient
from ..lib.errors import handle_errors, output_success


@click.group()
def feedback():
    """Submit feedback."""


@feedback.command("submit")
@click.option("--title", required=True, help="Feedback title.")
@click.option("--description", required=True, help="Feedback description.")
@click.pass_context
def submit_feedback(ctx, title, description):
    """Submit feedback to the Elnora team (creates a Linear issue)."""
    with handle_errors(ctx):
        client = ElnoraClient.from_env()
        result = client.submit_feedback(title=title, description=description)
        output_success(result, compact=ctx.obj["compact"], fmt=ctx.obj["fmt"], fields=ctx.obj["fields"])

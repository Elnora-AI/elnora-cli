"""Command-level integration tests — verify Click wiring with mocked client."""

import json
from unittest.mock import MagicMock, patch

from click.testing import CliRunner

from elnora.cli import cli

runner = CliRunner()

FAKE_KEY = "elnora_live_" + "x" * 30


def _mock_client():
    """Return a MagicMock ElnoraClient with common responses."""
    client = MagicMock()
    client.list_projects.return_value = {"items": [{"id": "abc-123", "name": "Test"}], "totalCount": 1}
    client.get_project.return_value = {"id": "abc-123", "name": "Test"}
    client.create_project.return_value = {"id": "abc-123", "name": "New"}
    client.list_tasks.return_value = {"items": [], "totalCount": 0}
    client.list_project_tasks.return_value = {"items": [], "totalCount": 0}
    client.get_task.return_value = {"id": "task-1", "title": "Test Task"}
    client.create_task.return_value = {"id": "task-1", "title": "Created"}
    client.send_message.return_value = {"id": "msg-1", "content": "Hello"}
    client.get_messages.return_value = {"items": [], "nextCursor": None}
    client.update_task.return_value = {"id": "task-1", "status": "completed"}
    client.archive_task.return_value = {}
    client.list_files.return_value = {"items": [], "totalCount": 0}
    client.get_file.return_value = {"id": "file-1", "name": "test.txt"}
    client.get_file_content.return_value = "file content here"
    client.get_file_versions.return_value = {"items": [], "totalCount": 0}
    client.search_tasks.return_value = {"items": [], "totalCount": 0}
    client.search_files.return_value = {"items": [], "totalCount": 0}
    return client


class TestProjectCommands:
    def test_list(self):
        mock = _mock_client()
        with patch("elnora.commands.projects.ElnoraClient.from_env", return_value=mock):
            result = runner.invoke(cli, ["projects", "list"])
        assert result.exit_code == 0
        parsed = json.loads(result.output)
        assert parsed["totalCount"] == 1

    def test_list_compact(self):
        mock = _mock_client()
        with patch("elnora.commands.projects.ElnoraClient.from_env", return_value=mock):
            result = runner.invoke(cli, ["--compact", "projects", "list"])
        assert result.exit_code == 0
        assert "\n" not in result.output.strip()

    def test_get(self):
        mock = _mock_client()
        with patch("elnora.commands.projects.ElnoraClient.from_env", return_value=mock):
            result = runner.invoke(cli, ["projects", "get", "bfdc6fbd-40ed-4042-9ea7-c79a5ec90085"])
        assert result.exit_code == 0

    def test_create(self):
        mock = _mock_client()
        with patch("elnora.commands.projects.ElnoraClient.from_env", return_value=mock):
            result = runner.invoke(cli, ["projects", "create", "--name", "Test"])
        assert result.exit_code == 0
        mock.create_project.assert_called_once()


class TestTaskCommands:
    def test_list(self):
        mock = _mock_client()
        with patch("elnora.commands.tasks.ElnoraClient.from_env", return_value=mock):
            result = runner.invoke(cli, ["tasks", "list"])
        assert result.exit_code == 0

    def test_create(self):
        mock = _mock_client()
        with patch("elnora.commands.tasks.ElnoraClient.from_env", return_value=mock):
            result = runner.invoke(cli, ["tasks", "create", "--project", "bfdc6fbd-40ed-4042-9ea7-c79a5ec90085"])
        assert result.exit_code == 0

    def test_send(self):
        mock = _mock_client()
        with patch("elnora.commands.tasks.ElnoraClient.from_env", return_value=mock):
            result = runner.invoke(
                cli,
                [
                    "tasks",
                    "send",
                    "bfdc6fbd-40ed-4042-9ea7-c79a5ec90085",
                    "--message",
                    "Hello",
                ],
            )
        assert result.exit_code == 0
        mock.send_message.assert_called_once()

    def test_messages(self):
        mock = _mock_client()
        with patch("elnora.commands.tasks.ElnoraClient.from_env", return_value=mock):
            result = runner.invoke(cli, ["tasks", "messages", "bfdc6fbd-40ed-4042-9ea7-c79a5ec90085"])
        assert result.exit_code == 0

    def test_update_success(self):
        mock = _mock_client()
        with patch("elnora.commands.tasks.ElnoraClient.from_env", return_value=mock):
            result = runner.invoke(
                cli,
                [
                    "tasks",
                    "update",
                    "bfdc6fbd-40ed-4042-9ea7-c79a5ec90085",
                    "--status",
                    "completed",
                ],
            )
        assert result.exit_code == 0

    def test_update_requires_field(self):
        result = runner.invoke(cli, ["tasks", "update", "bfdc6fbd-40ed-4042-9ea7-c79a5ec90085"])
        assert result.exit_code != 0

    def test_archive(self):
        mock = _mock_client()
        with patch("elnora.commands.tasks.ElnoraClient.from_env", return_value=mock):
            result = runner.invoke(cli, ["tasks", "archive", "bfdc6fbd-40ed-4042-9ea7-c79a5ec90085"])
        assert result.exit_code == 0
        parsed = json.loads(result.output)
        assert parsed["archived"] is True


class TestFileCommands:
    def test_list(self):
        mock = _mock_client()
        with patch("elnora.commands.files.ElnoraClient.from_env", return_value=mock):
            result = runner.invoke(cli, ["files", "list", "--project", "bfdc6fbd-40ed-4042-9ea7-c79a5ec90085"])
        assert result.exit_code == 0

    def test_content_raw(self):
        mock = _mock_client()
        with patch("elnora.commands.files.ElnoraClient.from_env", return_value=mock):
            result = runner.invoke(cli, ["files", "content", "bfdc6fbd-40ed-4042-9ea7-c79a5ec90085"])
        assert result.exit_code == 0
        assert "file content here" in result.output

    def test_content_compact_json(self):
        mock = _mock_client()
        with patch("elnora.commands.files.ElnoraClient.from_env", return_value=mock):
            result = runner.invoke(cli, ["--compact", "files", "content", "bfdc6fbd-40ed-4042-9ea7-c79a5ec90085"])
        assert result.exit_code == 0
        parsed = json.loads(result.output)
        assert parsed["content"] == "file content here"


class TestSearchCommands:
    def test_search_tasks(self):
        mock = _mock_client()
        with patch("elnora.commands.search.ElnoraClient.from_env", return_value=mock):
            result = runner.invoke(cli, ["search", "tasks", "--query", "test"])
        assert result.exit_code == 0

    def test_search_files(self):
        mock = _mock_client()
        with patch("elnora.commands.search.ElnoraClient.from_env", return_value=mock):
            result = runner.invoke(cli, ["search", "files", "--query", "protocol"])
        assert result.exit_code == 0

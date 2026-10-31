"""Create labels, milestones and requirement issues from issues.json (idempotent).

Uses only the standard library and the GitHub REST API, so it runs without `gh`.

Usage:
    set GITHUB_TOKEN=<fine-grained token with Issues: read/write>
    python scripts/github/create_issues.py --repo recepbulbul/Yunus_Hoca_Proje [--dry-run]
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

API = "https://api.github.com"
DATA = Path(__file__).with_name("issues.json")


class GitHub:
    def __init__(self, repo: str, token: str, *, dry_run: bool) -> None:
        self.repo = repo
        self.token = token
        self.dry_run = dry_run

    def request(self, method: str, path: str, body: dict[str, Any] | None = None) -> Any:
        if self.dry_run and method != "GET":
            print(f"[dry-run] {method} {path} {json.dumps(body, ensure_ascii=False)[:80]}")
            return {"number": 0}
        req = urllib.request.Request(  # noqa: S310 - fixed https base URL
            f"{API}/repos/{self.repo}{path}",
            method=method,
            data=json.dumps(body).encode() if body is not None else None,
            headers={
                "Authorization": f"Bearer {self.token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        with urllib.request.urlopen(req) as resp:  # noqa: S310
            return json.loads(resp.read() or b"null")

    def paginate(self, path: str) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        sep = "&" if "?" in path else "?"
        page = 1
        while batch := self.request("GET", f"{path}{sep}per_page=100&page={page}"):
            items.extend(batch)
            page += 1
        return items


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", required=True, help="owner/name")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        print("GITHUB_TOKEN is not set", file=sys.stderr)
        return 2

    gh = GitHub(args.repo, token, dry_run=args.dry_run)
    spec = json.loads(DATA.read_text(encoding="utf-8"))

    existing_labels = {label["name"] for label in gh.paginate("/labels")}
    for label in spec["labels"]:
        if label["name"] not in existing_labels:
            gh.request("POST", "/labels", label)
            print(f"label     + {label['name']}")

    milestones = {m["title"]: m["number"] for m in gh.paginate("/milestones?state=all")}
    for ms in spec["milestones"]:
        if ms["title"] not in milestones:
            milestones[ms["title"]] = gh.request("POST", "/milestones", ms)["number"]
            print(f"milestone + {ms['title']}")

    existing_titles = {i["title"] for i in gh.paginate("/issues?state=all")}
    for issue in spec["issues"]:
        if issue["title"] in existing_titles:
            print(f"issue     = {issue['title']} (exists)")
            continue
        payload = {
            "title": issue["title"],
            "body": issue["body"],
            "labels": issue["labels"],
            "milestone": milestones.get(issue["milestone"]),
        }
        created = gh.request("POST", "/issues", payload)
        print(f"issue     + #{created['number']} {issue['title']}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except urllib.error.HTTPError as exc:
        print(f"GitHub API error {exc.code}: {exc.read().decode()}", file=sys.stderr)
        raise SystemExit(1) from exc

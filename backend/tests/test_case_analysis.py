"""Tests for the merchant case analysis endpoint."""

from unittest.mock import patch

from tests.test_cases import _client, _signup
from app.db.models import Base


HEADERS = {"X-Requested-With": "XMLHttpRequest"}


def test_analyze_case_requires_login():
    client, engine = _client()

    try:
        response = client.post(
            "/cases/1/analyze",
            headers=HEADERS,
        )

        assert response.status_code == 401

    finally:
        client.close()
        Base.metadata.drop_all(engine)


def test_analyze_case_not_found():
    client, engine = _client()

    try:
        _signup(client)

        response = client.post(
            "/cases/999/analyze",
            headers=HEADERS,
        )

        assert response.status_code == 404
        assert response.json()["detail"] == "Case not found"

    finally:
        client.close()
        Base.metadata.drop_all(engine)


def test_analyze_case_unsupported_scenario():
    client, engine = _client()

    try:
        _signup(client)

        response = client.post(
            "/cases/3/analyze",
            headers=HEADERS,
        )

        assert response.status_code == 422
        assert response.json()["detail"] == (
            "Unable to identify a supported dispute scenario"
        )

    finally:
        client.close()
        Base.metadata.drop_all(engine)


def test_analyze_case_success():
    client, engine = _client()

    try:
        _signup(client)

        from sqlalchemy.orm import Session
        from app.db.models import Case

        with Session(engine) as db:
            case = Case(
                mode="merchant",
                scenario="item_not_received",
                status="open",
                findings={},
                risk_level="unknown",
                evidence_status="missing",
                overall_assessment="Pending",
            )

            db.add(case)
            db.commit()
            case_id = case.id

        with patch("app.routes.cases.analyze_case") as mock_analyze:
            mock_analyze.return_value = {
                "scenario_id": "item_not_received",
                "risk_score": 0,
            }

            response = client.post(
                f"/cases/{case_id}/analyze",
                headers=HEADERS,
            )

        assert response.status_code == 200
        assert response.json()["scenario_id"] == "item_not_received"

        mock_analyze.assert_called_once()

        case_data = mock_analyze.call_args.args[0]
        assert case_data["scenario_id"] == "item_not_received"
        assert case_data["mode"] == "merchant"

    finally:
        client.close()
        Base.metadata.drop_all(engine)
from tests.conftest import login


def test_doctor_status_transitions_write_audit_history(client, seeded):
    login(client, "asha.rao@example.com", "Doctor@123")
    appointment_id = seeded["booked_appointment_id"]

    for status in ("Checked In", "In Consultation", "Completed"):
        response = client.patch(
            f"/api/doctor/appointments/{appointment_id}/status",
            json={"status": status},
        )
        assert response.status_code == 200, response.get_json()
        assert response.get_json()["appointment"]["status"] == status

    detail = client.get(f"/api/doctor/appointments/{appointment_id}")
    assert detail.status_code == 200
    history = detail.get_json()["appointment"]["status_history"]
    assert len(history) == 3
    assert {(item["old_status"], item["new_status"]) for item in history} == {
        ("Booked", "Checked In"),
        ("Checked In", "In Consultation"),
        ("In Consultation", "Completed"),
    }


def test_invalid_status_transition_is_rejected(client, seeded):
    login(client, "asha.rao@example.com", "Doctor@123")
    appointment_id = seeded["booked_appointment_id"]

    response = client.patch(
        f"/api/doctor/appointments/{appointment_id}/status",
        json={"status": "Completed"},
    )
    assert response.status_code == 400
    assert response.get_json()["code"] == "invalid_status_transition"

    response = client.patch(
        f"/api/doctor/appointments/{appointment_id}/status",
        json={"status": "Unknown"},
    )
    assert response.status_code == 400
    assert response.get_json()["code"] == "validation_error"


def test_patient_cannot_change_clinical_status(client, seeded):
    login(client, "riya@example.com", "Patient@123")
    response = client.patch(
        f"/api/doctor/appointments/{seeded['booked_appointment_id']}/status",
        json={"status": "Checked In"},
    )
    assert response.status_code == 403


def test_clinical_records_require_check_in(client, seeded):
    login(client, "asha.rao@example.com", "Doctor@123")
    appointment_id = seeded["booked_appointment_id"]

    diagnosis = client.post(
        f"/api/appointments/{appointment_id}/diagnosis",
        json={"diagnosis_description": "Acute bronchitis."},
    )
    assert diagnosis.status_code == 400
    assert diagnosis.get_json()["code"] == "invalid_appointment_status"

    test_order = client.post(
        f"/api/appointments/{appointment_id}/tests",
        json={"test_type": "Chest X ray"},
    )
    assert test_order.status_code == 400
    assert test_order.get_json()["code"] == "invalid_appointment_status"


def test_doctor_can_record_diagnosis_and_prescription_without_tests(client, seeded):
    login(client, "asha.rao@example.com", "Doctor@123")
    appointment_id = seeded["booked_appointment_id"]

    checked_in = client.patch(
        f"/api/doctor/appointments/{appointment_id}/status",
        json={"status": "Checked In"},
    )
    assert checked_in.status_code == 200

    diagnosis_response = client.post(
        f"/api/appointments/{appointment_id}/diagnosis",
        json={
            "diagnosis_description": "Acute bronchitis.",
            "notes": "Chest examination clear. No breathing difficulty at rest.",
        },
    )
    assert diagnosis_response.status_code == 201
    diagnosis = diagnosis_response.get_json()["diagnosis"]
    assert diagnosis["prescription"] is None

    prescription_response = client.post(
        f"/api/diagnoses/{diagnosis['diagnosis_id']}/prescription",
        json={
            "treatment_plan": "Rest, fluids, and a short course of cough relief medicine.",
            "instructions": "Return if fever lasts more than three days or breathing becomes difficult.",
            "follow_up_date": seeded["later_date"],
        },
    )
    assert prescription_response.status_code == 201
    prescription = prescription_response.get_json()["prescription"]
    assert prescription["follow_up_date"] == seeded["later_date"]

    detail = client.get(f"/api/doctor/appointments/{appointment_id}")
    appointment = detail.get_json()["appointment"]
    assert appointment["diagnosis"]["diagnosis_description"] == "Acute bronchitis."
    assert appointment["diagnosis"]["prescription"]["treatment_plan"].startswith("Rest, fluids")
    assert appointment["tests"] == []


def test_doctor_can_order_test_and_record_result(client, seeded):
    login(client, "asha.rao@example.com", "Doctor@123")
    appointment_id = seeded["booked_appointment_id"]

    client.patch(
        f"/api/doctor/appointments/{appointment_id}/status",
        json={"status": "Checked In"},
    )
    test_response = client.post(
        f"/api/appointments/{appointment_id}/tests",
        json={
            "test_type": "Chest X ray",
            "notes": "Check for lower respiratory infection.",
        },
    )
    assert test_response.status_code == 201
    test = test_response.get_json()["test"]
    assert test["status"] == "Ordered"
    assert test["result"] is None

    result_response = client.post(
        f"/api/tests/{test['test_id']}/result",
        json={
            "result_summary": "No focal consolidation seen in either lung field.",
            "remarks": "The treating doctor should correlate with clinical findings.",
        },
    )
    assert result_response.status_code == 201
    updated_test = result_response.get_json()["test"]
    assert updated_test["status"] == "Completed"
    assert updated_test["result"]["result_summary"].startswith("No focal consolidation")

    duplicate = client.post(
        f"/api/tests/{test['test_id']}/result",
        json={"result_summary": "Second result."},
    )
    assert duplicate.status_code == 409
    assert duplicate.get_json()["code"] == "duplicate_result"


def test_duplicate_diagnosis_and_prescription_are_rejected(client, seeded):
    login(client, "asha.rao@example.com", "Doctor@123")
    appointment_id = seeded["booked_appointment_id"]

    client.patch(
        f"/api/doctor/appointments/{appointment_id}/status",
        json={"status": "Checked In"},
    )
    first = client.post(
        f"/api/appointments/{appointment_id}/diagnosis",
        json={"diagnosis_description": "Acute bronchitis."},
    )
    assert first.status_code == 201
    diagnosis_id = first.get_json()["diagnosis"]["diagnosis_id"]

    second = client.post(
        f"/api/appointments/{appointment_id}/diagnosis",
        json={"diagnosis_description": "A second diagnosis."},
    )
    assert second.status_code == 409
    assert second.get_json()["code"] == "duplicate_diagnosis"

    prescription = client.post(
        f"/api/diagnoses/{diagnosis_id}/prescription",
        json={
            "treatment_plan": "Rest and fluids.",
            "instructions": "Return if symptoms worsen.",
        },
    )
    assert prescription.status_code == 201

    duplicate = client.post(
        f"/api/diagnoses/{diagnosis_id}/prescription",
        json={
            "treatment_plan": "Another plan.",
            "instructions": "Another instruction.",
        },
    )
    assert duplicate.status_code == 409
    assert duplicate.get_json()["code"] == "duplicate_prescription"


def test_prescription_for_unknown_diagnosis_is_rejected(client, seeded):
    login(client, "asha.rao@example.com", "Doctor@123")
    response = client.post(
        "/api/diagnoses/99999/prescription",
        json={
            "treatment_plan": "Rest and fluids.",
            "instructions": "Return if symptoms worsen.",
        },
    )
    assert response.status_code == 404
    assert response.get_json()["code"] == "not_found"


def test_patient_can_read_own_clinical_record(client, seeded):
    login(client, "riya@example.com", "Patient@123")
    response = client.get("/api/patients/me/records?per_page=10")
    assert response.status_code == 200
    records = response.get_json()["records"]
    record = next(
        item for item in records if item["appointment_id"] == seeded["completed_appointment_id"]
    )
    assert record["diagnosis"]["diagnosis_description"] == "Mild iron deficiency anaemia."
    assert record["diagnosis"]["prescription"]["treatment_plan"].startswith("Oral iron")
    assert len(record["tests"]) == 1
    assert record["tests"][0]["result"]["result_summary"].startswith("Haemoglobin")

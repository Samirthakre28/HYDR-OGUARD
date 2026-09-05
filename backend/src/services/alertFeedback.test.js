import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { AlertFeedback } from "../models/AlertFeedback.js";
import {
  submitAlertFeedback,
  getAlertFeedback,
  getAlertFeedbackSummary
} from "../controllers/alert.controller.js";

// Helper mock req/res objects
function createMockReqRes({ params = {}, body = {}, query = {} } = {}) {
  const req = { params, body, query };
  let statusCode = 200;
  let responseData = null;

  const res = {
    status(code) {
      statusCode = code;
      return res;
    },
    json(data) {
      responseData = data;
      return res;
    }
  };

  const next = (err) => {
    if (err) throw err;
  };

  return { req, res, getStatus: () => statusCode, getData: () => responseData, next };
}

describe("HydroGuard - Alert Accuracy Feedback System Tests", () => {
  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/hydroguard_test");
    }
    await AlertFeedback.deleteMany({ alertId: { $regex: /^test-alert-/ } });
  });

  after(async () => {
    await AlertFeedback.deleteMany({ alertId: { $regex: /^test-alert-/ } });
  });

  it("Test 1: Rejects feedback without valid userResponse", async () => {
    const { req, res, getStatus, getData, next } = createMockReqRes({
      params: { alertId: "test-alert-1" },
      body: { comment: "Invalid request" }
    });

    await submitAlertFeedback(req, res, next);

    assert.equal(getStatus(), 400);
    assert.equal(getData().success, false);
    assert.match(getData().message, /userResponse is required/i);
  });

  it("Test 2: Rejects INCORRECT feedback with an invalid reason", async () => {
    const { req, res, getStatus, getData, next } = createMockReqRes({
      params: { alertId: "test-alert-2" },
      body: {
        userResponse: "INCORRECT",
        reason: "INVALID_REASON_CODE"
      }
    });

    await submitAlertFeedback(req, res, next);

    assert.equal(getStatus(), 400);
    assert.equal(getData().success, false);
    assert.match(getData().message, /Invalid reason provided/i);
  });

  it("Test 3: Successfully submits ACCURATE alert feedback", async () => {
    const { req, res, getStatus, getData, next } = createMockReqRes({
      params: { alertId: "test-alert-3" },
      body: {
        userResponse: "ACCURATE",
        alertRiskLevel: "CRITICAL",
        alertRiskScore: 88,
        alertType: "FLOOD",
        locationId: "kathmandu",
        mode: "LIVE"
      }
    });

    await submitAlertFeedback(req, res, next);

    assert.equal(getStatus(), 201);
    assert.equal(getData().success, true);
    assert.equal(getData().data.userResponse, "ACCURATE");
    assert.equal(getData().data.alertRiskLevel, "CRITICAL");
    assert.equal(getData().data.mode, "LIVE");
  });

  it("Test 4: Successfully submits INCORRECT feedback with reason and comment", async () => {
    const { req, res, getStatus, getData, next } = createMockReqRes({
      params: { alertId: "test-alert-4" },
      body: {
        userResponse: "INCORRECT",
        reason: "WRONG_LOCATION",
        comment: "Water levels were normal in my ward.",
        alertRiskLevel: "HIGH",
        alertRiskScore: 75,
        alertType: "LANDSLIDE",
        locationId: "kathmandu",
        mode: "LIVE"
      }
    });

    await submitAlertFeedback(req, res, next);

    assert.equal(getStatus(), 201);
    assert.equal(getData().success, true);
    assert.equal(getData().data.userResponse, "INCORRECT");
    assert.equal(getData().data.reason, "WRONG_LOCATION");
    assert.equal(getData().data.comment, "Water levels were normal in my ward.");
  });

  it("Test 5: Captures snapshot fields correctly without mutating risk calculations", async () => {
    const { req, res, getStatus, getData, next } = createMockReqRes({
      params: { alertId: "test-alert-5" },
      body: {
        userResponse: "INCORRECT",
        reason: "RISK_DID_NOT_OCCUR",
        alertRiskLevel: "HIGH",
        alertRiskScore: 82,
        alertType: "FLOOD",
        locationId: "kathmandu",
        mode: "DEMO"
      }
    });

    await submitAlertFeedback(req, res, next);

    assert.equal(getStatus(), 201);
    assert.equal(getData().data.mode, "DEMO");
    assert.equal(getData().data.alertRiskScore, 82);
  });

  it("Test 6: Retrieves feedback list for specific alertId", async () => {
    const { req, res, getStatus, getData, next } = createMockReqRes({
      params: { alertId: "test-alert-3" }
    });

    await getAlertFeedback(req, res, next);

    assert.equal(getStatus(), 200);
    assert.equal(getData().success, true);
    assert.equal(getData().count >= 1, true);
    assert.match(getData().disclaimer, /User-reported alert feedback/i);
  });

  it("Test 7: Retrieves feedback summary with accuracy percentage & explicit non-scientific disclaimer", async () => {
    const { req, res, getStatus, getData, next } = createMockReqRes({
      query: { mode: "ALL" }
    });

    await getAlertFeedbackSummary(req, res, next);

    assert.equal(getStatus(), 200);
    assert.equal(getData().success, true);
    assert.match(getData().disclaimer, /User-reported alert feedback — not scientific validation/i);
    assert.equal(typeof getData().data.totalFeedback, "number");
    assert.equal(typeof getData().data.accuracyPercentage, "number");
    assert.equal(typeof getData().data.reasons, "object");
  });
});

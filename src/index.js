import dotenv from "dotenv";
import axios from "axios";
import express from "express";
import { URLSearchParams } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Exotel API credentials
const exotelSid = process.env.EXOTEL_SID;
const apiKey = process.env.EXOTEL_API_KEY;
const apiToken = process.env.EXOTEL_API_TOKEN;
const subdomain = process.env.EXOTEL_SUBDOMAIN;
const fromNumber = process.env.FROM_NUMBER;
const callerId = process.env.CALLER_ID;
const toNumber = process.env.TO_NUMBER;
const serverEndpoint = process.env.SERVER_ENDPOINT;

// Function to make a call using Exotel
async function makeCall(toNumber, customParams = {}) {
  try {
    const url = `https://${apiKey}:${apiToken}@${subdomain}/v1/Accounts/${exotelSid}/Calls/connect.json`;

    const formData = new URLSearchParams();
    formData.append("From", fromNumber);
    formData.append("To", toNumber);
    formData.append("CallerId", callerId);

    // Add URL parameter if provided
    // if (customParams.AppUrl) {
    //   formData.append("Url", customParams.AppUrl);
    // }

    // Add any custom status callback URL
    if (customParams.StatusCallback) {
      formData.append("StatusCallback", customParams.StatusCallback);
    }

    // Add any custom fields
    if (customParams.CustomField) {
      formData.append("CustomField", customParams.CustomField);
    }

    console.log("Request data for Call : ", {
      url: url.replace(/:[^:]*@/, ":****@"), // Hide token in logs
      formData: Object.fromEntries(formData),
    });

    const response = await axios.post(url, formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    console.log("Call initiated successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Error making call:",
      error.response ? error.response.data : error.message
    );
    if (error.response && error.response.data) {
      console.error(
        "Error details:",
        JSON.stringify(error.response.data, null, 2)
      );
    }
    throw error;
  }
}

// Updated /call endpoint to include state management and call recording
app.get("/call", async (req, res) => {
  try {
    const { from, to } = req.query;

    console.log({ from, to });

    if (!from || !to) {
      return res
        .status(400)
        .json({ error: "Both 'from' and 'to' numbers are required" });
    }

    const url = `https://${apiKey}:${apiToken}@${subdomain}/v3/accounts/${exotelSid}/calls`;

    const payload = {
      from: { contact_uri: from, state_management: true },
      to: { contact_uri: to },
      custom_field: "customer_driver_call",
      max_time_limit: 4000,
      attempt_time_out: 45,
      custom_field: "test_call",
      status_callback: [
        {
          event: "terminal",
          url: `${serverEndpoint}/call-status`,
        },
      ],
    };

    const response = await axios.post(url, payload, {
      headers: { "Content-Type": "application/json" },
    });

    res.json({ success: true, data: response.data });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Simple test endpoint
app.get("/", (req, res) => {
  res.send("Exotel POC API is running!");
});

// Updated /exotel/call endpoint to dynamically determine target number
app.get("/exotel/call", async (req, res) => {
  try {
    const { CallFrom, Direction } = req.query;

    const exotelApiUrl = `https://${apiKey}:${apiToken}@${subdomain}/v3/accounts/<your_sid>/calls`;

    const customerNumber = fromNumber;
    const driverNumber = toNumber;

    let targetNumber;
    if (Direction === "incoming") {
      targetNumber =
        CallFrom === customerNumber ? driverNumber : customerNumber;
    } else {
      targetNumber = customerNumber; // Default for outbound calls
    }

    res.json({
      fetch_after_attempt: false,
      destination: { numbers: [targetNumber] },
      outgoing_phone_number: callerId,
      record: true,
      recording_channels: "dual",
      max_ringing_duration: 45,
      max_conversation_duration: 3600,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API to handle call status updates from Exotel
app.post("/call-status", async (req, res) => {
  try {
    console.log("Call status update received:", req.body);

    // Extract relevant details from the request body
    const {
      CallSid,
      Status,
      StartTime,
      EndTime,
      DialCallDuration,
      RecordingUrl,
      CustomField,
    } = req.body;

    // Log the call details for debugging or storage
    console.log("Call Details:", {
      CallSid,
      Status,
      StartTime,
      EndTime,
      DialCallDuration,
      RecordingUrl,
      CustomField,
    });

    // TODO: Add logic to store or process the call status update
    // For example, save the details to a database or trigger a notification

    res
      .status(200)
      .json({ success: true, message: "Call status processed successfully" });
  } catch (error) {
    console.error("Error processing call status:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/exotel/dial", async (req, res, next) => {
  try {
    console.log({ req, query: req.query });

    res.send(toNumber);
  } catch (error) {
    next(error);
  }
});

app.use((req, res, error, next) => {
  console.error("Error:", error);
  res.status(500).json({ message: "Internal Server Error", success: false });
});

app.use((req, res, next) => {
  res.status(404).json({ message: "Internal Server Error", success: false });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(
    "To make a call, send a POST request to /call with toNumber in the request body"
  );
});

// Example of direct call without API endpoint (uncomment to use)

async function callOwnService() {
  try {
    const url = `${serverEndpoint}/exotel/call`;

    console.log("Call to own service initiated successfully");

    // Simulate a real Exotel request with all the required parameters
    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
        "Exotel-Version": "1.0",
      },

      params: {
        CallerId: callerId,
        From: fromNumber,
        To: toNumber,
      },
    });

    console.log("Response Status:", response.status);
    console.log("Response Data:", response.data);

    // If successful, initiate an actual call using the response
    if (
      response.status === 200 &&
      response.data.destination &&
      response.data.destination.numbers
    ) {
      console.log(
        "Test successful! Now initiating an actual call using Exotel API..."
      );

      // Extract the target number from the response
      const targetNumber = response.data.destination.numbers[0];

      // Make an actual call using the enhanced makeCall function
      makeCall(targetNumber, {
        AppUrl: url,
      });
    }
  } catch (error) {
    console.error(
      "Error calling own service:",
      error.response?.status,
      error.response?.data || error.message
    );
  }
}

setTimeout(() => {
  // callOwnService();
  // makeCall(toNumber).catch((error) => console.error("Call failed:", error));
}, 2000); // Call after 2 seconds

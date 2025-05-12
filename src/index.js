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

// API endpoint to initiate a call
app.post("/call", async (req, res) => {
  try {
    const { toNumber } = req.body;

    if (!toNumber) {
      return res.status(400).json({ error: "toNumber is required" });
    }

    const result = await makeCall(toNumber);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data,
    });
  }
});

// Simple test endpoint
app.get("/", (req, res) => {
  res.send("Exotel POC API is running!");
});

// Exotel Connect URL endpoint
app.get("/exotel/call", async (req, res) => {
  try {
    console.log("Exotel Connect Request received:", {
      query: req.query,
      headers: req.headers,
    });

    // Extract important parameters from Exotel's request
    const {
      CallSid,
      CallFrom,
      CallTo,
      Direction,
      CallType,
      DialCallStatus,
      digits,
      CustomField,
    } = req.query;

    const exotelVersion = req.headers["exotel-version"] || "1.0";
    console.log(`Exotel Version: ${exotelVersion}`);

    let customerNumber, driverNumber;

    const getLinkedNumber = (number) => {
      const numberMappings = {
        // Format: 'originatingNumber': 'targetNumber'
        [fromNumber]: toNumber, // Driver to Customer
        [toNumber]: fromNumber, // Customer to Driver
      };

      return numberMappings[number] || toNumber; // Fall back to default toNumber if not found
    };

    if (Direction === "incoming") {
      // Incoming call to our Exotel number
      const callerNumber = CallFrom;
      const targetNumber = getLinkedNumber(callerNumber);

      if (callerNumber === fromNumber) {
        driverNumber = callerNumber;
        customerNumber = targetNumber;
      } else {
        // If caller is a customer
        customerNumber = callerNumber;
        driverNumber = targetNumber;
      }
    } else {
      // Outbound call - determine based on CallFrom/CallTo
      customerNumber = CallTo;
      driverNumber = getLinkedNumber(CallTo);
    }

    // Prepare the Exotel Connect response
    const connectResponse = {
      fetch_after_attempt: false,
      destination: {
        numbers: [driverNumber === CallFrom ? customerNumber : driverNumber],
      },
      outgoing_phone_number: callerId, // Using the configured callerId as ExoPhone
      record: true,
      recording_channels: "dual",
      max_ringing_duration: 45,
      max_conversation_duration: 3600, // 1 hour
      music_on_hold: {
        type: "default_tone",
      },
      start_call_playback: {
        playback_to: "both",
        type: "text",
        value:
          Direction === "incoming"
            ? "Connecting you with your ride. Please wait."
            : "Connecting you with your customer. Please wait.",
      },
    };

    // Set appropriate headers
    res.setHeader("Content-Type", "application/json");
    res.status(200).json(connectResponse);

    console.log("Exotel Connect Response:", connectResponse);
  } catch (error) {
    console.error("Error in Exotel Connect:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data,
    });
  }
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
  callOwnService();
  // makeCall(toNumber).catch((error) => console.error("Call failed:", error));
}, 2000); // Call after 2 seconds

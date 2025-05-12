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
async function makeCall(toNumber) {
  try {
    const url = `https://${apiKey}:${apiToken}@${subdomain}/v1/Accounts/${exotelSid}/Calls/connect.json`;

    const formData = new URLSearchParams();

    formData.append("From", fromNumber);

    formData.append("To", toNumber);

    formData.append("CallerId", callerId);

    console.log("Request data:", {
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

    // Check the Exotel-Version header
    const exotelVersion = req.headers["exotel-version"] || "1.0";
    console.log(`Exotel Version: ${exotelVersion}`);

    // Determine who is who based on direction and numbers
    let customerNumber, driverNumber;

    // Basic database lookup simulation
    // In a real app, you would query your database to find the linked customer/driver
    const getLinkedNumber = (number) => {
      // This is a simplified example - in production, use a database
      // to look up the corresponding number
      const numberMappings = {
        // Format: 'originatingNumber': 'targetNumber'
        fromNumber: toNumber, // Driver to Customer
        toNumber: fromNumber, // Customer to Driver
      };

      return numberMappings[number] || toNumber; // Fall back to default toNumber if not found
    };

    if (Direction === "incoming") {
      // Incoming call to our Exotel number
      const callerNumber = CallFrom;
      const targetNumber = getLinkedNumber(callerNumber);

      // Simple logic to determine if caller is customer or driver
      // In a real app, you would check against your user database
      if (callerNumber.startsWith("+919") && callerNumber.endsWith("1")) {
        // If caller is a driver (just an example condition)
        driverNumber = callerNumber;
        customerNumber = targetNumber;
      } else {
        // If caller is a customer
        customerNumber = callerNumber;
        driverNumber = targetNumber;
      }
    } else {
      // Outbound call - determine based on CallFrom/CallTo
      // The logic here would depend on your specific use case
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
// makeCall(toNumber).catch((error) => console.error("Call failed:", error));

async function callOwnService() {
  try {
    const url = `${serverEndpoint}/exotel/call`; // Correct use of ngrok URL

    console.log("Call to own service initiated successfully");

    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
      },
      params: {
        CallFrom: fromNumber,
        CallTo: toNumber,
        CallSid: exotelSid,
        CallerId: callerId,
      },
    });
    console.log("Response Status:", response.status);
    console.log("Response Data:", response.data);
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
}, 2000); // Call after 2 seconds

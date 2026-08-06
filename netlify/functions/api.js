const serverless = require("serverless-http");
const app = require("../../server/app");
const connectDB = require("../../server/config/db");

// Wrap the full Express app as a single serverless handler.
// Every route (/api/auth, /api/users, /api/visitors, /api/reports, /api/dashboard)
// is handled by this one function.
const serverlessHandler = serverless(app, {
  request: (req, event) => {
    // serverless-http marks the request "complete" and its synthetic stream is
    // unsafe to read on modern Node (fake socket), which makes express.json()
    // skip parsing and can crash finalhandler. Parse the JSON body from the
    // raw event ourselves and expose it as req.body. Keeping req.complete
    // true makes body-parser and finalhandler treat the request as finished
    // and never touch the stream.
    const rawBody = event.body;
    if (rawBody) {
      const text = Buffer.from(rawBody, event.isBase64Encoded ? "base64" : "utf8").toString("utf8");
      if (text) {
        try {
          req.body = JSON.parse(text);
        } catch {
          req.body = text;
        }
      }
    }
  },
});

let dbReady = false;

module.exports.handler = async (event, context) => {
  // Do not keep the Lambda warm waiting on the Mongo connection's event loop.
  context.callbackWaitsForEmptyEventLoop = false;

  // Reuse the mongoose default connection across warm invocations.
  // Mongoose keeps a global connection pool, so this is a cheap no-op once connected.
  if (!dbReady) {
    dbReady = await connectDB();
  }

  // Normalize the request path. Depending on how Netlify routes the request,
  // event.path may arrive as the public path (/api/visitors) or with the
  // function prefix (/.netlify/functions/api/visitors). Rebuild the public
  // path so Express mount points (/api/...) always match.
  const marker = "/.netlify/functions/api";
  const rawPath = event.path || "/";
  if (rawPath.startsWith(marker)) {
    event.path = "/api" + rawPath.slice(marker.length);
  }

  return serverlessHandler(event, context);
};

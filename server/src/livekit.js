const livekitServer = require("livekit-server-sdk");
const ROOM_NAME = "rc-car";
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;

const generateToken = async (req, res) => {
  const participantName = req.query.name;
  const at = new livekitServer.AccessToken(API_KEY, API_SECRET, {
    identity: participantName,
  });

  const videoGrant = {
    room: ROOM_NAME,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  };

  at.addGrant(videoGrant);

  const token = await at.toJwt();
  res.json({ accessToken: token });
};

module.exports = { generateToken };

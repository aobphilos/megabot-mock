require("dotenv").config();

const HyperExpress = require("hyper-express");
const { PrismaClient } = require("../dist/generated/prisma-client-js");

const prisma = new PrismaClient();

const app = new HyperExpress.Server();

const chatLogicId = process.env.CHAT_LOGIC_ID;
const port = Number(process.env.PORT) || 3001;

const OutgoingType = {
  TEXT: "text",
  MENU: "menu",
  CONFIRM: "confirm",
};

const regex = {
  hungry: new RegExp(/hungry/i),
  location: new RegExp(/location/i),
};

// call to channel api to get some user information and return to unify bot server
app.post("/hooks/enrich", async (req, res) => {
  const data = await req.json();

  console.log(`receive enrich -> ${JSON.stringify(data)}`);

  return res.json({
    user: {
      displayName: "cat lover",
      imageUrl:
        "https://hips.hearstapps.com/hmg-prod.s3.amazonaws.com/images/dog-puppy-on-garden-royalty-free-image-1586966191.jpg",
      status: "?",
      metadata: {
        age: "23",
        job: "-",
      },
    },
  });
});

// call to nlp api to get intent entity and action and return to unify bot server
app.post("/hooks/classification", async (req, res) => {
  const data = await req.json();

  console.log(`receive classification -> ${JSON.stringify(data)}`);

  if (regex.hungry.test(item.incomingMessage.payload)) {
    return res.json({
      conversation: {
        conversationId: item.conversation.conversationId,
        intent: {
          intentName: "hungry",
          confidence: 1,
        },
        entities: [
          {
            entityName: "menu",
            entityValue: "menu",
          },
        ],
      },
      action: {
        action: `@${chatLogicId}/menu`,
        metadata: {
          foo: "bar",
        },
      },
    });
  } else if (regex.location.test(item.incomingMessage.payload)) {
    return res.json({
      conversation: {
        conversationId: item.conversation.conversationId,
        intent: {
          intentName: "ask_location",
          confidence: 1,
        },
        entities: [
          {
            entityName: "restaurant",
            entityValue: "restaurant",
          },
        ],
      },
      action: {
        action: `restaurant_location`,
      },
    });
  }
  return res.json({
    conversation: {
      conversationId: item.conversation.conversationId,
      entities: [],
    },
    action: {
      action: `global_fail`,
    },
  });
});

// format the template message and return to unify bot server
app.post("/hooks/template", async (req, res) => {
  const data = await req.json();

  console.log(`receive template -> ${JSON.stringify(data)}`);

  const { user, channel, outgoingMessage } = data;

  return res.json({
    outgoingMessage: {
      userId: user.userId,
      channelId: channel.channelId,
      messages: outgoingMessage.messages,
    },
    shouldContextualize: true,
  });
});

// transform to channel message format and send to end user
app.post("/hooks/outgoing", async (req, res) => {
  const data = await req.json();

  const item = await prisma.outgoing.create({ data });

  console.log(`receive outgoing -> ${JSON.stringify(item)}`);

  return res.send("OK");
});
app.get("/hooks/outgoing/size", async (req, res) => {
  const size = await prisma.outgoing.count();
  res.json(size);
});

const getOutgoingHandler = async (req, res) => {
  const userId = req.params.userId;
  const type = req.params.type || OutgoingType.TEXT;

  const filterByType = (type) => {
    if (type === OutgoingType.MENU) {
      return {
        "outgoingMessage.messages": {
          $elemMatch: { type: "buttons", altText: "menu" },
        },
      };
    } else if (type === OutgoingType.CONFIRM) {
      return {
        "outgoingMessage.messages": {
          $elemMatch: { type: "buttons", altText: "confirm" },
        },
      };
    } else {
      return {
        "outgoingMessage.messages": { $elemMatch: { type: type } },
      };
    }
  };

  const [item] = await prisma.outgoing.findRaw({
    filter: {
      "user.userId": userId,
      ...filterByType(type),
    },
  });
  if (item) {
    res.json(item);
  } else {
    res.status(404).end();
  }
};
app.get("/hooks/outgoing/:userId/:type", getOutgoingHandler);
app.get("/hooks/outgoing/:userId", getOutgoingHandler);
app.delete("/hooks/outgoing", async (req, res) => {
  await prisma.outgoing.deleteMany();
  console.log("delete all outgoing");
  res.send("OK");
});

app
  .listen(port)
  .then(() => {
    console.log(
      `server is running on port ${port}, with Chat-Logic Id ${chatLogicId}`
    );
  })
  .catch((error) => console.error(`server error: ${error}`));

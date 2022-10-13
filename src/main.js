require("dotenv").config();

const HyperExpress = require("hyper-express");
const { PrismaClient } = require("../dist/generated/prisma-client-js");

const prisma = new PrismaClient();

const app = new HyperExpress.Server();

const chatLogicId = process.env.CHAT_LOGIC_ID;
const port = Number(process.env.PORT) || 3001;

const response = {
  template: new Map(),
  enrich: new Map(),
  outgoing: new Map(),
  classification: new Map(),
};

const regex = {
  hungry: new RegExp(/hungry/i),
  location: new RegExp(/location/i),
};

// call to channel api to get some user information and return to unify bot server
app.post("/hooks/enrich", async (req, res) => {
  const data = await req.json();

  const item = await prisma.enrich.create({ data });

  console.log(`receive enrich -> ${JSON.stringify(item)}`);

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
app.get("/hooks/enrich/size", async (req, res) => {
  const size = await prisma.enrich.count();
  res.json(size);
});
app.get("/hooks/enrich/:userId", async (req, res) => {
  const userId = req.params.userId;
  const [item] = await prisma.enrich.findRaw({
    filter: {
      "user.userId": userId,
    },
  });

  if (item) {
    res.json(item);
  } else {
    res.status(404).end();
  }
});
app.delete("/hooks/enrich", async (req, res) => {
  await prisma.enrich.deleteMany();
  console.log("delete all enriches");
  res.send("OK");
});

// call to nlp api to get intent entity and action and return to unify bot server
app.post("/hooks/classification", async (req, res) => {
  const data = await req.json();

  const item = await prisma.classification.create({ data });

  console.log(`receive classification -> ${JSON.stringify(item)}`);

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
app.get("/hooks/classification/size", async (req, res) => {
  const size = await prisma.classification.count();
  res.json(size);
});
app.get("/hooks/classification/:userId", async (req, res) => {
  const userId = req.params.userId;
  const [item] = await prisma.classification.findRaw({
    filter: {
      "user.userId": userId,
    },
  });

  if (item) {
    res.json(item);
  } else {
    res.status(404).end();
  }
});
app.delete("/hooks/classification", async (req, res) => {
  await prisma.classification.deleteMany();
  console.log("delete all classifications");
  res.send("OK");
});

// format the template message and return to unify bot server
app.post("/hooks/template", async (req, res) => {
  const data = await req.json();

  const item = await prisma.template.create({ data });

  console.log(`receive template -> ${JSON.stringify(item)}`);

  const { user, channel, outgoingMessage } = item;

  return res.json({
    outgoingMessage: {
      userId: user.userId,
      channelId: channel.channelId,
      messages: outgoingMessage.messages,
    },
    shouldContextualize: true,
  });
});
app.get("/hooks/template/size", async (req, res) => {
  const size = await prisma.template.count();
  res.json(size);
});
app.get("/hooks/template/:userId", async (req, res) => {
  const userId = req.params.userId;
  const [item] = await prisma.template.findRaw({
    filter: {
      "user.userId": userId,
    },
  });
  if (item) {
    res.json(item);
  } else {
    res.status(404).end();
  }
});
app.delete("/hooks/template", async (req, res) => {
  await prisma.template.deleteMany();
  console.log("delete all templates");
  res.send("OK");
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
app.get("/hooks/outgoing/:userId", async (req, res) => {
  const userId = req.params.userId;
  const [item] = await prisma.outgoing.findRaw({
    filter: {
      "user.userId": userId,
    },
  });
  if (item) {
    res.json(item);
  } else {
    res.status(404).end();
  }
});
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

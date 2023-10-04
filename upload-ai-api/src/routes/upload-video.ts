import { FastifyInstance } from "fastify";
import { fastifyMultipart } from "@fastify/multipart";
import path from "node:path";
import { prisma } from "../lib/prisma";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { pipeline } from "node:stream";
import { promisify } from "node:util";

const pump = promisify(pipeline);

export async function uploadVideoRoute(app: FastifyInstance) {
  app.register(fastifyMultipart, {
    limits: {
      fileSize: 1_048_576 * 25,
    },
  });

  app.post("/videos", async (req, res) => {
    const data = await req.file();

    if (!data) {
      return res.status(400).send({ error: " Missing file input." });
    }
    const extension = path.extname(data.filename);

    if (extension !== ".mp3") {
      return res
        .status(400)
        .send({ error: "Invalid input type, please upload MP3" });
    }

    const fileBaseName = path.basename(data.filename, extension);
    const fileUploadName = `${fileBaseName}-${randomUUID()}${extension}`;

    const uploadDir = path.resolve(__dirname, "../../tmp", fileUploadName);

    await pump(data.file, fs.createWriteStream(uploadDir));

    const video = await prisma.video.create({
      data: {
        name: data.filename,
        path: uploadDir,
      },
    });

    return { video };
  });
}

import { createUser } from "../src/services/userServices";
import { Gender } from "../src/models/User";
import { logger } from "../src/logger";

const userFillerArr: any[] = [
  {
    name: "admin",
    password: "123",
    email: "admin@email.com",
    isAdmin: true,
    gender: Gender.NO_ANSWER,
  },
  {
    name: "Lena Hoffmann",
    password: "Sommer2024!",
    email: "lena.hoffmann@gmail.com",
    isAdmin: false,
    gender: Gender.FEMALE,
  },
  {
    name: "Jonas Becker",
    password: "Fussball_92",
    email: "jonas.becker@web.de",
    isAdmin: false,
    gender: Gender.MALE,
  },
  {
    name: "Sophie Wagner",
    password: "Kaffee&Buch7",
    email: "sophie.wagner@outlook.com",
    isAdmin: false,
    gender: Gender.FEMALE,
  },
  {
    name: "Maximilian Schmidt",
    password: "Berlin2023#",
    email: "max.schmidt@gmx.de",
    isAdmin: false,
    gender: Gender.MALE,
  },
  {
    name: "Alex Neumann",
    password: "Reisen!804",
    email: "alex.neumann@yahoo.de",
    isAdmin: false,
    gender: Gender.NO_ANSWER,
  },
];

export async function prefillWithUsers() {
  for (const fillUser of userFillerArr) {
    try {
      await createUser(fillUser);
      logger.info("Prefill: user added", { name: fillUser.name });
    } catch {
      // user likely already exists – that's fine
      logger.debug("Prefill: user already exists, skipping", { name: fillUser.name });
    }
  }
}

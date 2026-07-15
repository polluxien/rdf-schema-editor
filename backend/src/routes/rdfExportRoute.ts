import express from "express";
import { body, validationResult } from "express-validator";
import {
  ensureContainerRunning,
  pullLatest,
  transform,
  type Delimiter,
  type OutputFormat,
} from "@/services/rdfTransformService";
import { logger } from "../logger";

export const rdfExportRouter = express.Router();

const VALID_FORMATS: OutputFormat[] = ["turtle", "ntriples", "jsonld"];
const VALID_DELIMITERS: Delimiter[] = ["COMMA", "TAB", "SEMICOLON", "PIPE"];

rdfExportRouter.post(
  "/rdf",
  body("rml").isString().notEmpty(),
  body("csv").isString().notEmpty(),
  body("outputFormat")
    .optional()
    .isIn(VALID_FORMATS)
    .withMessage(`outputFormat must be one of: ${VALID_FORMATS.join(", ")}`),
  body("delimiter")
    .optional()
    .isIn(VALID_DELIMITERS)
    .withMessage(`delimiter must be one of: ${VALID_DELIMITERS.join(", ")}`),
  body("sourceType")
    .optional()
    .isIn(["CSV", "TSV", "JSON"])
    .withMessage("sourceType must be CSV, TSV or JSON"),

  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { rml, csv, outputFormat, delimiter, sourceType } = req.body as {
      rml: string;
      csv: string;
      outputFormat?: OutputFormat;
      delimiter?: Delimiter;
      sourceType?: "CSV" | "TSV" | "JSON";
    };

    try {
      logger.info("POST /api/export/rdf — pulling latest and ensuring container");

      const { changed } = await pullLatest();
      await ensureContainerRunning(changed);

      const { body: rdfBytes, contentType } = await transform(rml, csv, {
        outputFormat,
        delimiter,
        sourceType,
      });

      const ext =
        outputFormat === "jsonld"
          ? "jsonld"
          : outputFormat === "ntriples"
          ? "nt"
          : "ttl";

      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="output.${ext}"`,
      );
      res.setHeader("Content-Length", rdfBytes.length);
      return res.status(200).send(rdfBytes);
    } catch (err) {
      logger.error("RDF export failed", { err: String(err) });
      next(err);
    }
  },
);

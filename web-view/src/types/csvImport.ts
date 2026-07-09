export interface CsvImportOptions {
  delimiter: string;
  charset: string;
  hasHeader: boolean;
  quoteChar: string;
  /**
   * Max number of data rows to import. `undefined` (or a non-positive value)
   * imports all rows. Lets the user build the model from a small sample of a
   * large file.
   */
  maxRows?: number;
}

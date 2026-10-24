import { describe, expect, it } from "vitest";
import { isDuplicateOfxTransaction, ofxBatchDuplicateKey, parseOfxTransactions } from "./ofxParser";

const negativeTimezoneOffset = String.fromCharCode(91) + "-3:BRT" + String.fromCharCode(93);

const sgmlStatement = `
OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <STMTRS>
        <BANKTRANLIST>
          <STMTTRN>
            <TRNTYPE>DEBIT
            <DTPOSTED>20261015120000${negativeTimezoneOffset}
            <TRNAMT>-12.34
            <FITID>fit-001
            <NAME>Loja
            <MEMO>Compra do mês
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>CREDIT
            <DTPOSTED>20261016120000
            <TRNAMT>45.67
            <FITID>900719925474099312345
            <NAME>Reembolso
          </STMTTRN>
        </BANKTRANLIST>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>`;

describe("parseOfxTransactions", () => {
  it("reads every transaction from standard headered OFX SGML", () => {
    expect(parseOfxTransactions(sgmlStatement)).toEqual([
      {
        amount: 12.34,
        type: "EXPENSE",
        description: "Compra do mês",
        date: "2026-10-15",
        external_id: "fit-001",
      },
      {
        amount: 45.67,
        type: "INCOME",
        description: "Reembolso",
        date: "2026-10-16",
        external_id: "900719925474099312345",
      },
    ]);
  });

  it("accepts XML-formatted OFX too", () => {
    const xml = `<?xml version="1.0"?><OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
      <STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20261015</DTPOSTED><TRNAMT>-8.50</TRNAMT>
      <FITID>xml-1</FITID><NAME>XML Shop</NAME></STMTTRN>
    </BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;

    expect(parseOfxTransactions(xml)).toEqual([
      {
        amount: 8.5,
        type: "EXPENSE",
        description: "XML Shop",
        date: "2026-10-15",
        external_id: "xml-1",
      },
    ]);
  });

  it("rejects malformed dates instead of importing against the current date", () => {
    expect(() =>
      parseOfxTransactions(sgmlStatement.replace("20261015120000", "20260231120000"))
    ).toThrow(/impossible DTPOSTED date/);
  });

  it("rejects files without an OFX document", () => {
    expect(() => parseOfxTransactions("not an ofx file")).toThrow(/does not contain an OFX/);
  });
});

describe("OFX duplicate detection", () => {
  const incoming = {
    amount: 12.34,
    type: "EXPENSE" as const,
    description: "Mercado",
    date: "2026-10-15",
    external_id: null,
  };

  it("does not discard same-day, same-amount transactions with different descriptions when FITID is absent", () => {
    expect(
      isDuplicateOfxTransaction(
        {
          account_id: "account-1",
          amount: "12.34",
          type: "EXPENSE",
          date: "2026-10-15",
          external_id: null,
          description: "Farmácia",
        },
        incoming,
        "account-1"
      )
    ).toBe(false);
  });

  it("uses the description fallback when FITID is absent and rejects repeated content within a file", () => {
    const existing = {
      account_id: "account-1",
      amount: 12.34,
      type: "EXPENSE",
      date: "2026-10-15",
      external_id: null,
      description: "Mercado",
    };
    expect(isDuplicateOfxTransaction(existing, incoming, "account-1")).toBe(true);
    expect(ofxBatchDuplicateKey(incoming, "account-1")).toBe(
      ofxBatchDuplicateKey({ ...incoming }, "account-1")
    );
    expect(ofxBatchDuplicateKey(incoming, "account-1")).not.toBe(
      ofxBatchDuplicateKey({ ...incoming, description: "Farmácia" }, "account-1")
    );
  });

  it("compares FITIDs when both records have one", () => {
    const existing = {
      account_id: "account-1",
      amount: 12.34,
      type: "EXPENSE",
      date: "2026-10-15",
      external_id: "fit-001",
      description: "Old description",
    };
    expect(
      isDuplicateOfxTransaction(existing, { ...incoming, external_id: "fit-001" }, "account-1")
    ).toBe(true);
    expect(
      isDuplicateOfxTransaction(existing, { ...incoming, external_id: "fit-002" }, "account-1")
    ).toBe(false);
  });
});

// src/utils.test.js
import { extractFlatNumber, tokenizeInput, findTokenDistance, matchingNameInTransaction, isSimilar, normalizeFlatNo, isSameFlat, parseCurrency } from "../utils";



describe("extractFlatNumberSimple", () => {
  const testCases = [
      { input: "A201", expected: { flatNumber: "201", confidence: "M" } },
      { input: "A201 Q1", expected: { flatNumber: "201", confidence: "H" } },
      { input: "B105", expected: { flatNumber: "105", confidence: "M" } },
      { input: "Q1 305", expected: { flatNumber: "305", confidence: "M" } },
      { input: "Flat 110", expected: { flatNumber: "110", confidence: "L" } },
      { input: "NEFT-HDFCN", expected: { flatNumber: "None", confidence: "N" } },
      { input: "Random 500", expected: { flatNumber: "None", confidence: "N" } },
      { input: "Q1 A 215", expected: { flatNumber: "215", confidence: "H" } },
  ];
  
  testCases.forEach(({ input, expected }) => {
    test(`extractFlatNumberSimple('${input}') should return '${JSON.stringify(expected)}'`, () => {
      const result = extractFlatNumber(input);
      expect(result).toStrictEqual(expected);
  });
  });
});


describe("findTokenDistance", () => {
  test.each([
      [["A", "B", "101"], 1, "A", -1], // Closest A is at index 0 (-1)
      [["A", "B", "101"], 2, "A", -2], // A is at index 0 (-2)
      [["A", "101", "B"], 1, "B", 1], // B is at index 2 (+1)
      [["A", "101", "B", "A"], 2, "A", -2], // Closest A is at index 0 (-2)
      [["101", "B", "A", "101"], 0, "A", 2], // A is at index 2 (+2)
      [["A", "102", "Q1"], 1, "Q1", 1], // Q1 is at index 2 (+1)
      [["B", "103", "Q1"], 1, "Q1", 1], // Q1 is at index 2 (+1)
      [["Flat", "105"], 1, "Flat", -1], // Flat is at index 0 (-1)
      [["Flat", "105"], 0, "105", 1], // 105 is at index 1 (+1)
      [["A", "B", "C"], 1, "D", null], // D is not found
  ])("findTokenDistance(%j, %d, %s) should return %s", (tokens, fromIndex, toToken, expected) => {
      expect(findTokenDistance(tokens, fromIndex, toToken)).toBe(expected);
  });
});

describe("tokenizeInput", () => {
  const testCases = [
    { 
      input: "MMT/IMPS/501916371508/207 b maintaina/JENNER THE/HDFC Bank", 
      expected: ["MMT", "IMPS", "501916371508", "207", "B", "MAINTAINA", "JENNER", "THE", "HDFC", "BANK"]
    },
    { 
      input: "UPI/9686180088@axl/Payment from Ph/HDFC BANK LTD/755535063296/AXL8affa73223944fb197bb43897d381594", 
      expected: ["UPI", "9686180088", "AXL", "PAYMENT", "FROM", "PH", "HDFC", "BANK", "LTD", "755535063296", "AXL", "8", "AFFA", "73223944", "FB", "197", "BB", "43897", "D", "381594"]
    },
    { 
      input: "UPI/mssrivathsan1@a/A201 Q1 Mainten/ICICI Bank/717901922474/AXL84d96ea5202a40b49738b6c3d6785b6d", 
      expected: ["UPI", "MSSRIVATHSAN","1", "A", "A", "201", "Q1", "MAINTEN", "ICICI", "BANK", "717901922474", "AXL", "84", "D", "96", "EA", "5202", "A", "40", "B", "49738", "B", "6", "C", "3", "D", "6785", "B", "6", "D"]
    },
    { 
      input: "UPI/ankit.himself@y/A114Q12025/HDFC BANK LTD/945166909737/YBL0fc960651b634122bc6ac5e3fe554ce0", 
      expected: ["UPI", "ANKIT", "HIMSELF", "Y", "A", "114", "Q1","2025", "HDFC", "BANK", "LTD", "945166909737", "YBL", "0", "FC", "960651", "B", "634122", "BC", "6", "AC", "5", "E", "3", "FE", "554", "CE", "0"]
    },
    { 
      input: "BIL/INFT/EAN6370016/Q1B205/ ARUNACHALAM GUN", 
      expected: ["BIL", "INFT", "EAN", "6370016", "Q1", "B", "205", "ARUNACHALAM", "GUN"]
    },
    { 
      input: "BIL/INFT   /EAN6370016/Q4B205/ ARUNACHALAM GUN", 
      expected: ["BIL", "INFT", "EAN", "6370016", "Q4", "B", "205", "ARUNACHALAM", "GUN"]
    },
    { 
      input: "BIL/INFT   /EAN6370016/Q2Q1B205/ ARUNACHALAM GUN", 
      expected: ["BIL", "INFT", "EAN", "6370016", "Q2", "Q1", "B", "205", "ARUNACHALAM", "GUN"]
    }
  ]; 
  

  testCases.forEach(({ input, expected }) => {
    test(`tokenizeInput('${input}') should return '${expected}'`, () => {
      expect(tokenizeInput(input)).toStrictEqual(expected);
    });
  });
});

describe('matchingNameInTransaction (Fuzzy Matching)', () => {
  test.each([
      [
          "MMT/IMPS/502914743508/JSON FELECIA F/RAJNISH KU/Kotak Mahindra - VIQUAR AZEEM/RAJNISH KUMAR", 
          "VIQUAR AZEEM",
          ["viquar", "azeem"]
      ],
      [
          "BIL/INFT/EAQ6864910/ SUNDEEP SEHGAL - SUNDIP SEHGAL", 
          "Sundip Sehgal",
          ["sundip", "sehgal"]
      ],
      [
          "MMT/IMPS/502116146817/FLAT 002 Q1 202/ABBAS MANT/HDFC Bank - ABBAS MEERAN", 
          "John Doe",
          []
      ],
      [
          "BIL/INFT/EAQ6864910/ SUNDEEP SEHGAL -  SUNDIP SEHGAL", 
          "  sUndeeP   sehGal ",
          ["sundeep", "sehgal"]
      ],
      [
        "UPI/7760797651@ybl/Payment from Ph/HDFC BANK LTD/307882143211/YBL21c68d2bb5084ee2a53c0741820310ac",
        "GEETHA / ARPAN NAIK",
        []
      ],
      [
          "RAJNISH KUMAR", 
          "RAJNISH",
          ["rajnish"]
      ],
      [
          "RAJNISH KUMAR", 
          "VISHWAS",
          []
      ],
      [
        "RAJNISH KUMAR", 
        "SHIWAS",
        []
    ]
  ])('isNameInTransaction(%s, %s)', (transaction, name, expected) => {
      expect(matchingNameInTransaction(transaction, name)).toStrictEqual(expected);
  });
});


describe('isSimilar', () => {
  test.each([
    ["john", "john", null, true], // Exact match
    ["john", "johnny", null, false], // Different lengths, no match
    ["john", "joh", null, false], // Shorter length, no match
    ["john", "joan", null, false], // One character difference, match
    ["john", "joan", 0, false], // One character difference, exact match required
    ["john", "joan", 1, true], // One character difference, threshold 1
    ["john", "joan", 2, true], // One character difference, threshold 2
    ["john", "johnxy", 2, true], // two character difference, threshold 2
    ["john", "johnxyz", 2, false], // three character difference, threshold 2
    ["john", "joan", 3, true], // One character difference, threshold 3
    ["john", "jo", null, false], // Shorter length, no match
    ["john", "jo", 1, false], // Shorter length, threshold 1
    ["john", "jo", 2, true], // Shorter length, threshold 2

  ])('isSimilar(%s, %s, %s) should return %s', (name, desc, threshold, expected) => {
    expect(isSimilar(name, desc, threshold)).toBe(expected);
  });
});

describe('normalizeFlatNo', () => {
  test.each([
    ["B-311 TF", "B311TF"],
    ["b311tf", "B311TF"],
    [" B 311TF ", "B311TF"],
    ["101", "101"],
    [null, ""],
    [undefined, ""]
  ])('normalizeFlatNo(%s) should return %s', (input, expected) => {
    expect(normalizeFlatNo(input)).toBe(expected);
  });
});

describe('isSameFlat', () => {
  test.each([
    ["B-311 TF", "B311TF", true],
    ["b311tf", "B311TF", true],
    [" B 311TF ", "B311TF", true],
    ["101", "101", true],
    ["101", "102", false],
    ["A101", "B101", false],
    [null, "B311TF", false],
    ["B311TF", null, false]
  ])('isSameFlat(%s, %s) should return %s', (flat1, flat2, expected) => {
    expect(isSameFlat(flat1, flat2)).toBe(expected);
  });
});

describe('parseCurrency', () => {
  test.each([
    ["500", 500],
    ["500.50", 500.5],
    ["-500", -500],
    ["-500.50", -500.5],
    ["- 500.50", -500.5],
    ["₹500.00", 500],
    ["Rs. 1,500.00", 1500],
    ["-1,500.00", -1500],
    ["100-", 100], // unusual case
    [500, 500],
    [-500.5, -500.5],
    ["", 0],
    [null, 0],
    [undefined, 0],
    ["abc", 0]
  ])('parseCurrency(%s) should return %s', (input, expected) => {
    expect(parseCurrency(input)).toBe(expected);
  });
});
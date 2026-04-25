import { extractFlatNumber, tokenizeInput } from "../utils";

describe("extractFlatNumber", () => {
  const testCases = [
    { input: "MMT/IMPS/501916371508/207 b maintaina/JENNER THE/HDFC Bank", expected: { flatNumber: "207", confidence: "M" } },
    { input: "UPI/9686180088@axl/Payment from Ph/HDFC BANK LTD/755535063296/AXL8affa73223944fb197bb43897d381594", expected: { flatNumber: "None", confidence: "N" } },
    // { input: "UPI/mssrivathsan1@a/A201 Q1 Mainten/ICICI Bank/717901922474/AXL84d96ea5202a40b49738b6c3d6785b6d", expected: { flatNumber: "201", confidence: "H" } },
    { input: "UPI/ankit.himself@y/A114Q12025/HDFC BANK LTD/945166909737/YBL0fc960651b634122bc6ac5e3fe554ce0", expected: { flatNumber: "114", confidence: "H" } },
    { input: "BIL/INFT/EAN6370016/Q1B205/ ARUNACHALAM GUN", expected: { flatNumber: "205", confidence: "H" } },
    { input: "MMT/IMPS/502010323215/Flat 314 Mainta/VISHAL PRA/HDFC Bank", expected: { flatNumber: "314", confidence: "L" } },
    { input: "MMT/IMPS/502010325453/B010 maintananc/DIPAK PAL /HDFC Bank", expected: { flatNumber: "010", confidence: "M" } },
    { input: "MMT/IMPS/502014335532/B206 kundan/KUNDAN KUM/HDFCBank", expected: { flatNumber: "206", confidence: "M" } },
    // { input: "MMT/IMPS/502116146817/FLAT 002 Q1 202/ABBAS MANT/HDFC Bank", expected: { flatNumber: "002", confidence: "H" } },
    // { input: "BIL/INFT/EAR6894126/FLAT305/ GAUTAM KASUKHEL", expected: { flatNumber: "305", confidence: "H" } },
    // { input: "BIL/INFT/EAR6966960/Q1 25 A303 Main/ VIMAL RAJASEKAR", expected: { flatNumber: "303", confidence: "H" } },
    // { input: "BIL/INFT/EAS7058183/003 maintenance/ VIJAY KESAVINAM", expected: { flatNumber: "003", confidence: "M" } },
    // { input: "UPI/vinayprabhakar1/Payment from Ph/ICICI Bank/315429885151/YBL1063c08ff73d49d2b6b5f820d4543e11", expected: { flatNumber: "None", confidence: "N" } },
    // { input: "UPI/udhaya.ooty-1@o/UPI/HDFC BANK LTD/502477526806/HDF78511fb3395d4dfab956ea1bfd687c92", expected: { flatNumber: "None", confidence: "N" } },
    // { input: "NEFT-HDFCN52025012522012093-VISHWANATH HEDDOORI-0001-50100012214291-HDFC0000001", expected: { flatNumber: "None", confidence: "N" } },
    // { input: "NEFT-HDFCN52025012522053970-RENJITH P K-0001-50100089970954-HDFC0000001", expected: { flatNumber: "None", confidence: "N" } },
    // { input: "MMT/IMPS/502512363644/A315 MAINTENANC/HARSIMRAN /Kotak Mahindra", expected: { flatNumber: "315", confidence: "H" } },
    // { input: "BIL/INFT/EAT7237135/116 maintenance/ REEJA SHERAFUDE", expected: { flatNumber: "116", confidence: "M" } },
    // { input: "BIL/INFT/EAU7332980/2024Q4Flat102/ ANBARASU PERIAS", expected: { flatNumber: "102", confidence: "H" } },
    // { input: "MMT/IMPS/502707159943/211/J MAGESH /HDFC Bank", expected: { flatNumber: "211", confidence: "M" } },
    // { input: "MMT/IMPS/502716139452/B311 Maintenan/ASHIRBAD D/HDFC Bank", expected: { flatNumber: "311", confidence: "M" } },
    // { input: "NEFT-SBINN52025012872459664-Mr SREENIVASA MURTHY K V-/ATTN//INB//210 Q1 M-00000010842833178-SBIN0", expected: { flatNumber: "210", confidence: "H" } },
    // { input: "BIL/INFT/EAX7748347/A101 Q1 2025/ FELIX ELROY", expected: { flatNumber: "101", confidence: "H" } },
    // { input: "MMT/IMPS/503004152329/Flat111 Q1 2025/SAURABH KU/HDFC Bank", expected: { flatNumber: "111", confidence: "H" } },
    // { input: "MMT/IMPS/503012412723/Flat310Q1mainte/ALOKKUMAR /Axis Bank", expected: { flatNumber: "310", confidence: "H" } },
    // { input: "BIL/INFT/EAZ8104272/Flat016Q125Giri/ GIRISH CHANDAR", expected: { flatNumber: "016", confidence: "H" } },
    // { input: "BIL/INFT/EAZ8277830/q12025 109B/ D N RAJESH", expected: { flatNumber: "109", confidence: "H" } },
    // { input: "MMT/IMPS/503317307156/214 Q12024/ROHIT KUMA/HDFC Bank", expected: { flatNumber: "214", confidence: "H" } },
    // { input: "MMT/IMPS/503320380352/Flat 208 Q1 202/PILLARI HA/HDFC Bank", expected: { flatNumber: "208", confidence: "H" } },
    // { input: "BIL/INFT/EB39105525/B108Q12025/ K K SHARMA", expected: { flatNumber: "108", confidence: "H" } },
    // { input: "UPI/7799649123@ibl/107 maintenance/State Bank Of I/129763762352/IBLb2b67131062446469cb91c74bdfd6590", expected: { flatNumber: "107", confidence: "H" } },
    // { input: "BIL/INFT/EB39170467/B304/ ANKUR SINHA", expected: { flatNumber: "304", confidence: "M" } },
    // { input: "MMT/IMPS/503509872935/Q1 Flat 307/DEBASHIS P/Kotak Mahindra", expected: { flatNumber: "307", confidence: "H" } },
    // { input: "BIL/INFT/EB59624777/FLAT 006 Q1/ CHANDRASEKARAN", expected: { flatNumber: "006", confidence: "H" } },
    // { input: "BIL/INFT/EB59664781/Maintanance 106/ MUBEEN ANSARI", expected: { flatNumber: "106", confidence: "M" } },
    // { input: "MMT/IMPS/504122614573/FLAT 301/SHABAZ AH/Kotak Mahindra", expected: { flatNumber: "301", confidence: "H" } }
  ]
  

  testCases.forEach(({ input, expected }) => {
      test(`extractFlatNumber('${input}') should return '${JSON.stringify(expected)}'`, () => {
          expect(extractFlatNumber(input)).toStrictEqual(expected);
      });
  });
});
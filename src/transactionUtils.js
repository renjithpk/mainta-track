export const parseTransactionData = (allData) => {
  const mapping = {
    id: "Transaction ID",
    description: "Description",
    amount: "Transaction Amount(INR)"
  };

  const transformHeader = (header) => header.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

  const filteredData = allData.map(row => {
    const transformedRow = {};
    Object.keys(mapping).forEach(key => {
      const transformedKey = transformHeader(mapping[key]);
      transformedRow[key] = row[transformedKey] || 'N/A'; // Handle missing fields
    });
    return transformedRow;
  });

  const headerMap = Object.keys(mapping).map(key => ({
    id: key,
    Header: mapping[key],
    accessor: key
  }));

  return { headerMap, filteredData };
};
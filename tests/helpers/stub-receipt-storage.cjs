// Business-planner/transaction tests isolate the receipt I/O adapter.
// Real hidden-ledger storage and atomic marker retries have their own tests.
module.exports = context => Object.assign(context, {
  receiptLedgerFind_: () => null,
  registrationReceiptRequests_: (_book, receipt) => [{ createDeveloperMetadata: { developerMetadata: {
    metadataId: (parseInt(receipt.requestId.replace(/-/g, '').slice(0, 8), 16) & 0x7fffffff) || 1,
    metadataKey: 'rpth_reg_' + receipt.requestId, metadataValue: JSON.stringify(receipt),
    visibility: 'DOCUMENT', location: { spreadsheet: true }
  } } }]
});

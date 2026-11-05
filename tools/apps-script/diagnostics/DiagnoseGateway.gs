// Add this as a separate Script file in the EXISTING Apps Script project.
// Run diagnoseGatewayConfig from the editor. No deployment or sheet writes.
// This report contains a short key fingerprint, never the actual key.
function diagnoseGatewayConfig() {
  var secret = PropertiesService.getScriptProperties().getProperty('RPTH_GATEWAY_SECRET') || '';
  var hex = function (bytes) {
    return Array.prototype.map.call(bytes, function (byte) {
      return ('0' + (byte & 255).toString(16)).slice(-2);
    }).join('');
  };
  console.log(JSON.stringify({
    source: 'Apps Script properties',
    length: secret.length,
    hex64: /^[a-f0-9]{64}$/.test(secret),
    fingerprint: hex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, secret, Utilities.Charset.UTF_8)).slice(0, 16),
    utf8HmacTest: hex(Utilities.computeHmacSha256Signature('RPTH gateway UTF-8 ทดสอบ', 'public-test-key', Utilities.Charset.UTF_8))
  }, null, 2));
}

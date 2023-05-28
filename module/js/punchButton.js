const body = $request.body;
const paramsArr = body.split('&');
const randomNumber = Math.floor(Math.random() * 10);

const keyDataMap = [
  { key: 'deviceInfo', exists: false, params: `deviceInfo=${encodeURIComponent('{"status":"1","SSID":"EN+","networkType":"wifi","BSSID":"58:b3:8f:72:14:50"}')}` },
  { key: 'mac', exists: false, params: 'mac=58:b3:8f:72:14:50' },
  { key: 'sid', exists: false, params: `sid=${encodeURIComponent('EN+')}` },
  { key: 'positionInfo', exists: false, params: `positionInfo=${encodeURIComponent('{"status":"1","err_Info":"success","longitude":113.933'+ randomNumber + ',"speed":-1,"latitude":22.6362' + randomNumber + ',"accuracy":35,"errMsg":"getLocation:ok","address":"广东省深圳市南山区西丽街道松白路1026号深圳市南岗第二工业园"}')}` },
  { key: 'longitude', exists: false, params: `longitude=${encodeURIComponent('113.933' + randomNumber)}` },
  { key: 'latitude', exists: false, params: `latitude=${encodeURIComponent('22.6362' + randomNumber)}` },
  { key: 'position', exists: false, params: 'position=广东省深圳市南山区西丽街道松白路1026号深圳市南岗第二工业园 '}
];

for (let i = 0; i < paramsArr.length; i++) {
  const [key, value] = paramsArr[i].split('=');
  keyDataMap.forEach(item => {
    if (key === item.key) {
      item.exists = true;
      paramsArr[i] = item.params;
    }
  });
}
const notExistsKeyDataMap = keyDataMap.filter(item => item.exists == false);
notExistsKeyDataMap && notExistsKeyDataMap.forEach(item => {paramsArr[paramsArr.length] = item.params});
const newBody = paramsArr.join('&');

$done({
  body: newBody
});

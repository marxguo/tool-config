//http://oa.en-plus.com.cn:8090/api/hrm/kq/attendanceButton/punchButton
// let obj = JSON.parse($request);

// obj.deviceInfo = {"status":"1","SSID":"EN+","networkType":"wifi","BSSID":"58:b3:8f:72:14:50"};
// obj.mac = '58:b3:8f:72:14:50';
// obj.sid = 'EN+';
// obj.positionInfo = {"status":"1","err_Info":"success","longitude":113.9332,"speed":-1,"latitude":22.63625,"accuracy":35,"errMsg":"getLocation:ok","address":"广东省深圳市南山区西丽街道松白路1026号深圳市南岗第二工业园"};
// obj.longitude = 113.9332;
// obj.latitude = 22.63625;
// obj.position = '广东省深圳市南山区西丽街道松白路1026号深圳市南岗第二工业园';
  
// $done({body: JSON.stringify({"a":1})});



const body = $request.body;
const paramsArr = body.split('&');
for (let i = 0; i < paramsArr.length; i++) {
  const [key, value] = paramsArr[i].split('=');
  if (key === 'deviceInfo') {
    paramsArr[i] = 'deviceInfo={"status":"1","SSID":"EN+","networkType":"wifi","BSSID":"58:b3:8f:72:14:50"}';
  }
  if (key === 'mac') {
    paramsArr[i] = 'mac=58:b3:8f:72:14:50';
  }
  if (key === 'sid') {
    paramsArr[i] = 'sid=EN+';
  }
  if (key === 'positionInfo') {
    paramsArr[i] = 'positionInfo={"status":"1","err_Info":"success","longitude":113.9332,"speed":-1,"latitude":22.63625,"accuracy":35,"errMsg":"getLocation:ok","address":"广东省深圳市南山区西丽街道松白路1026号深圳市南岗第二工业园"}';
  }
  if (key === 'longitude') {
    paramsArr[i] = 'longitude=113.9332';
  }
  if (key === 'latitude') {
    paramsArr[i] = 'latitude=22.63625';
  }
  if (key === 'position') {
    paramsArr[i] = 'position=广东省深圳市南山区西丽街道松白路1026号深圳市南岗第二工业园';
  }
}
const newBody = paramsArr.join('&');
$done({
  body: newBody
});

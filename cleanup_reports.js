const https = require('https');

const projectRef = 'ozknsbctqjghsbulwoja';
const token = 'sbp_9c5fbd40db2dc422c6f52a7adf7a77e44fcb0957';
const sql = 'TRUNCATE TABLE work_reports CASCADE;';

const options = {
    hostname: 'api.supabase.com',
    path: `/v1/projects/${projectRef}/query`,
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
};

console.log('Executing SQL cleanup...');

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('✅ Thành công! Đã xóa sạch dữ liệu báo cáo cũ.');
            console.log('Response:', data);
        } else {
            console.error('❌ Thất bại. Status:', res.statusCode);
            console.error('Response:', data);
        }
    });
});

req.on('error', (e) => {
    console.error('Request error:', e);
});

req.write(JSON.stringify({ query: sql }));
req.end();

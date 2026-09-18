const body = JSON.parse($response.body);

const items = body?.groupitem2?.items;

if (Array.isArray(items)) {
    const overtimeItem = items.find(item => item?.name === 'overTimes');

    if (overtimeItem) {
        overtimeItem.name = 'overTimess';
    }
}

$done({
    body: JSON.stringify(body)
});
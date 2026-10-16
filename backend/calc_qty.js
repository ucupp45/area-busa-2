const http = require('http');

http.get('http://localhost:5000/api/realisasi', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            let totalsByDate = {};
            
            parsed.forEach(r => {
                let d = new Date(r.tanggal);
                let dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                
                if (!totalsByDate[dateStr]) totalsByDate[dateStr] = 0;
                
                if (r.carousel_items) {
                    r.carousel_items.forEach(c => {
                        if (c.tipe_mesin === 'Horizontal' || c.tipe_mesin === 'Carousel') {
                            totalsByDate[dateStr] += Number(c.hasil2_qty || 0);
                        }
                    });
                }
            });
            console.log('Totals by date:', totalsByDate);
        } catch (e) {
            console.error(e);
        }
    });
});

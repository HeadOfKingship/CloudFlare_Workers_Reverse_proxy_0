//将"www.google.com"替换成你像反代的网站
const upstream = 'www.github.com'
 
// 若该站点有专门的移动适配站点，替换这里的'www.google.com'，如果没有则保持和上面一致
const upstream_mobile = 'www.github.com'
 
// 将['T1']修改为你希望禁止哪些国家/地区访问(这里的T1指Tor浏览器,你可以修改为如US,RU,CN等)
const blocked_region = ['T1']
 
// 禁止自访问
const blocked_ip_address = ['0.0.0.0', '127.0.0.1']
 
// 这里替换成你想镜像的站点
const replace_dict = {
    '$upstream': '$custom_domain',
    '//www.github.com': ''
}
 
addEventListener('fetch', event => {
    event.respondWith(fetchAndApply(event.request));
})
 
async function fetchAndApply(request) {
        let url = new URL(request.url);
    // 如果是根目录，则直接返回自定义内容
    if (url.pathname === "/") {
        // 这里可以自定义返回的内容，修改This is the root directory, not proxied.为你想要的内容
        return new Response("This is the root directory, not proxied.", {
            status: 200,
            headers: { "content-type": "text/plain" }
        });
    }
    // ...existing code...
    const region = request.headers.get('cf-ipcountry').toUpperCase();
    const ip_address = request.headers.get('cf-connecting-ip');
    const user_agent = request.headers.get('user-agent');
 
    let response = null;
    let url_host = url.host;
 
    if (url.protocol == 'http:') {
        url.protocol = 'https:'
        response = Response.redirect(url.href);
        return response;
    }
 
    if (await device_status(user_agent)) {
        upstream_domain = upstream
    } else {
        upstream_domain = upstream_mobile
    }
 
    url.host = upstream_domain;
 
    if (blocked_region.includes(region)) {
        response = new Response('Access denied: WorkersProxy is not available in your region yet.', {
            status: 403
        });
    } else if(blocked_ip_address.includes(ip_address)){
        response = new Response('Access denied: Your IP address is blocked by WorkersProxy.', {
            status: 403
        });
    } else{
        let method = request.method;
        let request_headers = request.headers;
        let new_request_headers = new Headers(request_headers);
 
        new_request_headers.set('Host', upstream_domain);
        new_request_headers.set('Referer', url.href);
 
        let original_response = await fetch(url.href, {
            method: method,
            headers: new_request_headers
        })
 
        let original_response_clone = original_response.clone();
        let original_text = null;
        let response_headers = original_response.headers;
        let new_response_headers = new Headers(response_headers);
        let status = original_response.status;
 
        new_response_headers.set('access-control-allow-origin', '*');
        new_response_headers.set('access-control-allow-credentials', true);
        new_response_headers.delete('content-security-policy');
        new_response_headers.delete('content-security-policy-report-only');
        new_response_headers.delete('clear-site-data');
 
        const content_type = new_response_headers.get('content-type');
        if (content_type.includes('text/html') && content_type.includes('UTF-8')) {
            original_text = await replace_response_text(original_response_clone, upstream_domain, url_host);
        } else {
            original_text = original_response_clone.body
        }
 
        response = new Response(original_text, {
            status,
            headers: new_response_headers
        })
    }
    return response;
}
 
async function replace_response_text(response, upstream_domain, host_name) {
    let text = await response.text()
 
    var i, j;
    for (i in replace_dict) {
        j = replace_dict[i]
        if (i == '$upstream') {
            i = upstream_domain
        } else if (i == '$custom_domain') {
            i = host_name
        }
 
        if (j == '$upstream') {
            j = upstream_domain
        } else if (j == '$custom_domain') {
            j = host_name
        }
 
        let re = new RegExp(i, 'g')
        text = text.replace(re, j);
    }
    return text;
}
 
async function device_status (user_agent_info) {
    var agents = ["Android", "iPhone", "SymbianOS", "Windows Phone", "iPad", "iPod"];
    var flag = true;
    for (var v = 0; v < agents.length; v++) { if (user_agent_info.indexOf(agents[v]) > 0) {
            flag = false;
            break;
        }
    }
    return flag;
}

-- Configuration
local base_url = "http://localhost:8000/api/v1"
local post_payloads = {
  '{"vendorType":"sync","vendorPayload":{"productId":"PROD-001","quantity":5}}',
  '{"vendorType":"async","vendorPayload":{"userId":"USER-ABC","action":"generate_report"}}',
  '{"vendorType":"sync","vendorPayload":{"itemId":"ITEM-XYZ","location":"warehouse_A"}}',
  '{"vendorType":"async","vendorPayload":{"customerId":"CUST-999","event":"process_order"}}',
  '{"vendorType":"sync","vendorPayload":{"query":"latest_news","category":"tech"}}'
}

local request_ids = {}
local last_post = false

-- Helper to generate a random UUID (for GET fallback)
local function uuid()
  local template ='xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
  return string.gsub(template, '[xy]', function (c)
      local v = (c == 'x') and math.random(0, 0xf) or math.random(8, 0xb)
      return string.format('%x', v)
  end)
end

-- Setup function (called once per thread)
function setup(thread)
  thread:set("request_ids", request_ids)
end

-- Request function (called for each request)
request = function()
  -- 30% POST, 70% GET
  if math.random() < 0.3 then
    wrk.method = "POST"
    wrk.headers["Content-Type"] = "application/json"
    local payload = post_payloads[math.random(#post_payloads)]
    wrk.body = payload
    last_post = true
    return wrk.format(nil, base_url .. "/jobs/post")
  else
    wrk.method = "GET"
    wrk.body = nil
    local req_id
    if #request_ids > 0 then
      req_id = request_ids[math.random(#request_ids)]
    else
      req_id = uuid()
    end
    last_post = false
    return wrk.format(nil, base_url .. "/jobs/" .. req_id)
  end
end

-- Response function (called after each response)
response = function(status, headers, body)
  -- If last request was POST and succeeded, try to extract request_id
  if last_post and status == 202 and body then
    local req_id = string.match(body, '"request_id"%s*:%s*"([^"]+)"')
    if req_id then
      table.insert(request_ids, req_id)
    end
  end
end
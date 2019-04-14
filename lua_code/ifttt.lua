--ifttt.lua
conn = nil
json = '{"sensorId":"5.2.5"}'
conn=net.createConnection(net.TCP, 0) 

conn:on("receive", function(conn, payload) 
     local data = string.match(payload,"{.*}")
     print(data)
     print(collectgarbage('count'))
     conn:close() 
     end) 
     
conn:on("connection", function(conn, payload) 
     print('\nConnected')
     conn:send("POST /updateMovement"
      .." HTTP/1.1\r\n" 
      .."Host: cabin-esp826612e.rhcloud.com\r\n"
      .."Accept: */*\r\n" 
      .."User-Agent: Mozilla/4.0 (compatible; esp8266 Lua; Windows NT 5.1)\r\n" 
      .."Content-Length: "..string.len(json).."\r\n"
      .."\r\n"
      ..json.."\r\n")
     end) 
     
conn:on("disconnection", function(conn, payload) 
      print('\nDisconnected') 
      end)
      
print('Posting to rhcloud')                                    
conn:connect(80,'cabin-esp826612e.rhcloud.com')

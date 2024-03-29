import React, { useState, useEffect } from 'react';

const App = () => {
  const [device, setDevice] = useState(null);
  const [characteristic, setCharacteristic] = useState(null);
  const [receivedData, setReceivedData] = useState('');
  const [error, setError] = useState('');
  const [fileInput, setFileInput] = useState(null);
  const [chunkSize, setchunkSize] = useState(512);
  const [callbacksize, setcallbacksize] = useState(0)
  const [parsedData, setParsedData] = useState(null);
  const [SegmentCallback, setSegmentCallback] = useState(0);
  const [loadPercent, setLoadpercent] = useState(0);
  const [TotalByte, setTotalByte] = useState(0);
  const [UseByte, setUseByte] = useState(0);

  const connectToDevice = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ name: 'ESP32 dev' }],
      });

      console.log('Connecting to GATT server...');
      const server = await device.gatt.connect();

      console.log('Getting primary service...');
      const service = await server.getPrimaryService('4fafc201-1fb5-459e-8fcc-c5c9c331914b');

      console.log('Getting ota service...');
      const characteristic = await service.getCharacteristic('beb5483e-36e1-4688-b7f5-ea07361b26a8');
      console.log('Characteristic Properties:', characteristic.properties);

      console.log('Getting callback_ota_size...');
      const callback_ota_size = await service.getCharacteristic('e32d6400-0a1c-43af-a591-8634cc4b7af4');


      setDevice(device);
      setCharacteristic(characteristic);


      callback_ota_size.addEventListener('characteristicvaluechanged', handle_callback_ota_size);
      await callback_ota_size.startNotifications();

    } catch (error) {
      setError(`Error connecting to BLE device: ${error}`);
    }
  };

  const handle_callback_ota_size = (event) => {
    const value = event.target.value;
    const ota_size = new TextDecoder().decode(value);
    setParsedData(ota_size);
  };

  const disconnectDevice = async () => {
    if (device && device.gatt.connected) {
      await device.gatt.disconnect();
      setDevice(null);
      setCharacteristic(null);
      setReceivedData('');
      setError('');
    }
  };


const sendFile = async () => {

    const OTA_SIZE = fileInput.files[0].size;
    const encoder = new TextEncoder();
    const START_OTA_SIZE = encoder.encode(OTA_SIZE);

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      setError('Please select a file');
      return;
    }

    //await characteristic.writeValue(START_OTA_LOAD);
    await characteristic.writeValue(START_OTA_SIZE);

    const file = fileInput.files[0];

    // Read the file in chunks
    const fileReader = new FileReader();
    let offset = 0;

    fileReader.onload = async (event) => {
      const chunk = new Uint8Array(event.target.result);

      // Send the chunk to the BLE device
      try {
        await characteristic.writeValue(chunk);
      } catch (error) {
        console.error('Error writing value to characteristic:', error);
      }
      

      offset += chunk.length;

      // Continue reading the next chunk
      if (offset < file.size) {
        readNextChunk();
      } else {
        setError('');
      }
    };

    // Start reading the first chunk
    const readNextChunk = () => {
      const slice = file.slice(offset, offset + chunkSize);
      fileReader.readAsArrayBuffer(slice);
    };
    
    //document.getElementById('sendButton').addEventListener('click', readNextChunk);
    readNextChunk();
};

  useEffect(() => {
    if(fileInput){
      let percent_ota = (callbacksize / fileInput.files[0].size) * 100
      console.log(percent_ota);
      setLoadpercent(percent_ota)
    }
    const parsedValue = JSON.parse(parsedData);
    // Check if parsedValue is not null before accessing properties
    if (parsedValue !== null && typeof parsedValue === 'object') {
      console.log(parsedValue);
      setcallbacksize(parsedValue.ota_size);
      setReceivedData(parsedValue.msg_status);
      setSegmentCallback(parsedValue.Segment);
      setTotalByte(parsedValue.Total_byte);
      setUseByte(parsedValue.Use_byte);
    } else {
      console.error('parsedValue is null or not an object');
    }
  },[parsedData])

  return (
    <div className="flex items-center justify-center h-screen">
      <div className='bg-neutral p-5 md:p-10 lg:p-20 rounded-3xl'>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {device ? (
          <div>
            <div>
              <p className="text-lg md:text-xl lg:text-2xl">Connected to: {device.name}</p>
              <p>Received Data: {receivedData}</p>
              <p>Ota Size callback: {callbacksize}</p>
              <p>Segment callback: {SegmentCallback}</p>
              <p>Total Byte: {TotalByte}</p>
              <p>Use Byte: {UseByte}</p>
              <progress className="progress progress-error" value={loadPercent} max="100"></progress>
              <p>Installing: {loadPercent.toFixed(2)} %</p>
            </div>
  
            <div className='flex flex-col md:flex-row gap-1 pt-4 md:pt-6 lg:pt-9'>
              <input type="file" accept=".bin" onChange={(e) => setFileInput(e.target)} className="mb-2 md:mb-0" />
              {fileInput && fileInput.files && fileInput.files.length > 0 && (
                <p className="mb-2 md:mb-0">Selected File Size: {fileInput.files[0].size} bytes</p>
              )}
              <label className="mb-2 md:mb-0">
                Chunk Size:
                <input
                  type="number"
                  value={chunkSize}
                  onChange={(e) => setchunkSize(parseInt(e.target.value, 10))}
                  className="mb-2 md:mb-0 ml-2 md:ml-4"
                />
              </label>
              <button className='btn btn-primary mb-2 md:mb-0 ml-2 md:ml-4' onClick={sendFile}>Send File</button>
              <button className='btn btn-primary mb-2 md:mb-0 ml-2 md:ml-4' onClick={disconnectDevice}>Disconnect</button>
              <button className='btn btn-primary mb-2 md:mb-0 ml-2 md:ml-4' id='sendButton'>SendNextChunk</button>
            </div>
  
          </div>
        ) : (
          <div className='pt-6 md:pt-10 lg:pt-20'>
            <button className='btn btn-primary' onClick={connectToDevice}>Connect to BLE Device</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;

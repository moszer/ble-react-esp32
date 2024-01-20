import React, { useState, useEffect } from 'react';

const App = () => {
  const [device, setDevice] = useState(null);
  const [characteristic, setCharacteristic] = useState(null);
  const [receivedData, setReceivedData] = useState('');
  const [error, setError] = useState('');
  const [fileInput, setFileInput] = useState(null);
  const [chunkSize, setchunkSize] = useState(512);

  const connectToDevice = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ name: 'ESP32 dev' }],
      });

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('4fafc201-1fb5-459e-8fcc-c5c9c331914b');
      const characteristic = await service.getCharacteristic('beb5483e-36e1-4688-b7f5-ea07361b26a8');

      setDevice(device);
      setCharacteristic(characteristic);

      // Set up event listener for characteristic value changes
      characteristic.addEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);

      // Enable notifications
      await characteristic.startNotifications();
    } catch (error) {
      setError(`Error connecting to BLE device: ${error}`);
    }
  };

  const handleCharacteristicValueChanged = (event) => {
    const value = event.target.value;
    const stringValue = new TextDecoder().decode(value);
    setReceivedData(stringValue);
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

    const encoder = new TextEncoder();
    const OTA_SIZE = fileInput.files[0].size;
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
      await characteristic.writeValue(chunk);

      offset += chunk.length;

      // Continue reading the next chunk
      if (offset < file.size) {
        readNextChunk();
      } else {
        setError('');
      }
    };

    const readNextChunk = () => {
      const slice = file.slice(offset, offset + chunkSize);
      fileReader.readAsArrayBuffer(slice);
    };

    // Start reading the first chunk
    readNextChunk();
  };

  return (
    <div>
      <h1>React BLE Web App</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {device ? (
        <div>
          <p>Connected to: {device.name}</p>
          <p>Received Data: {receivedData}</p>
          <input type="file" accept=".bin" onChange={(e) => setFileInput(e.target)} />
          {fileInput && fileInput.files && fileInput.files.length > 0 && (
            <p>Selected File Size: {fileInput.files[0].size} bytes</p>
          )}
          <label>
            Chunk Size:
            <input
              type="number"
              value={chunkSize}
              onChange={(e) => setchunkSize(parseInt(e.target.value, 10))}
            />
          </label>
          <button onClick={sendFile}>Send File</button>
          <button onClick={disconnectDevice}>Disconnect</button>
        </div>
      ) : (
        <button onClick={connectToDevice}>Connect to BLE Device</button>
      )}
    </div>
  );
};

export default App;

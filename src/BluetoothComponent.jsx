import React, { useEffect, useState } from 'react';

const BluetoothComponent = () => {
  const [characteristic, setCharacteristic] = useState(null);

  const connectToDevice = async () => {
    try {
      console.log('Requesting Bluetooth device...');
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ name: 'ESP32 dev' }],
      });

      console.log('Connecting to GATT server...');
      const server = await device.gatt.connect();

      console.log('Getting primary service...');
      const service = await server.getPrimaryService('4fafc201-1fb5-459e-8fcc-c5c9c331914b');

      console.log('Getting characteristic...');
      const char = await service.getCharacteristic('e32d6400-0a1c-43af-a591-8634cc4b7af4');

      console.log('Enabling notifications...');
      await char.startNotifications();

      // Set the characteristic in the state
      setCharacteristic(char);

      console.log('Connected to device and set up notifications.');

      // Listen for notifications
      char.addEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);
    } catch (error) {
      console.error('Bluetooth Error:', error);
    }
  };

  const handleCharacteristicValueChanged = (event) => {
    const value = event.target.value;
    // Handle the received value from the ESP32 device
    console.log('Received value:', value);
  };

  return (
    <div>
      <h1>Bluetooth Component</h1>
      <button onClick={connectToDevice}>Connect to Device</button>
      {/* Add your UI components here */}
    </div>
  );
};

export default BluetoothComponent;

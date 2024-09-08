import React, { useEffect, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import { CardanoSyncClient } from "@saibdev/utxorpc-sdk";

function App() {
  const [events, setEvents] = useState<any>([]);

  useEffect(() => {
    const syncClient = new CardanoSyncClient({
      uri: "http://localhost:50051",
    });

    const fetchEvents = async () => {
      const tip = syncClient.followTip([
        {
          slot: 59142873,
          hash: "8f4d03561d9829cefc4cd71966f460a691cb50013748dba663712198f7268759",
        },
      ]);

      for await (const event of tip) {
        setEvents((prevEvents: any) => [...prevEvents, event]);
        console.log(event);
      }
    };

    fetchEvents();

    // Cleanup function
    return () => {
      // If the CardanoSyncClient has a method to close the connection, call it here
      // For example: syncClient.close();
    };
  }, []); // Empty dependency array means this effect runs once on mount
  
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <ul>
          {events.map((event: any, index: number) => (
            <li key={index}>{JSON.stringify(event)}</li>
          ))}
        </ul>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;

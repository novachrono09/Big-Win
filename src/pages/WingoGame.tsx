import React from 'react';
import SessionTabs from '../components/SessionTabs';
import CountdownPanel from '../components/CountdownPanel';
import BettingPanel from '../components/BettingPanel';
import CurrentBets from '../components/CurrentBets';
import GameHistory from '../components/GameHistory';

export default function WingoGame() {
  return (
    <>
      <SessionTabs />
      <div className="pb-24">
        <CountdownPanel />
        <BettingPanel />
        <CurrentBets />
        <GameHistory />
      </div>
    </>
  );
}
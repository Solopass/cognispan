import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { Navigation, ActiveTab } from './components/layout/Navigation';
import { Dashboard } from './components/dashboard/Dashboard';
import { SandboxView } from './components/dashboard/SandboxView';
import { AnalyticsView } from './components/dashboard/AnalyticsView';
import { AboutView } from './components/dashboard/AboutView';
import { SettingsView } from './components/dashboard/SettingsView';
import { DailyProtocolRunner } from './components/protocol/DailyProtocolRunner';
import { DualNBackView } from './components/tasks/DualNBack/DualNBackView';
import { DigitSpanView } from './components/tasks/DigitSpan/DigitSpanView';
import { CorsiView } from './components/tasks/CorsiBlocks/CorsiView';
import { OSpanView } from './components/tasks/OperationSpan/OSpanView';
import { KeepTrackView } from './components/tasks/KeepTrack/KeepTrackView';
import { storageService } from './services/storageService';
import { TaskType, UserCognitiveProfile, DigitSpanMode, CorsiMode } from './types/cognitive';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [activeRunningTask, setActiveRunningTask] = useState<TaskType | 'protocol' | null>(null);
  const [taskOptions, setTaskOptions] = useState<{
    nLevel?: number;
    digitMode?: DigitSpanMode;
    corsiMode?: CorsiMode;
    targetCatCount?: number;
  }>({});
  const [profile, setProfile] = useState<UserCognitiveProfile>(storageService.getProfile());

  useEffect(() => {
    storageService.requestPersistentStorage();
  }, []);

  const refreshProfile = () => {
    setProfile(storageService.getProfile());
  };

  const handleStartProtocol = () => {
    setActiveRunningTask('protocol');
  };

  const handleLaunchTask = (task: TaskType) => {
    setTaskOptions({});
    setActiveRunningTask(task);
  };

  const handleLaunchCustomTask = (task: TaskType, options?: Record<string, unknown>) => {
    setTaskOptions({
      nLevel: options?.nLevel as number | undefined,
      digitMode: options?.digitMode as DigitSpanMode | undefined,
      corsiMode: options?.corsiMode as CorsiMode | undefined,
      targetCatCount: options?.targetCatCount as number | undefined
    });
    setActiveRunningTask(task);
  };

  const handleExitTask = () => {
    setActiveRunningTask(null);
    refreshProfile();
  };

  return (
    <div className="min-h-screen bg-background text-zinc-100 flex flex-col font-sans">
      <Header currentStreak={profile.currentStreakDays} onRefreshData={refreshProfile} />

      {!activeRunningTask && (
        <Navigation
          activeTab={activeTab}
          onSelectTab={tab => setActiveTab(tab)}
        />
      )}

      <main className="flex-1 flex flex-col">
        {/* If user is running an active drill or protocol */}
        {activeRunningTask === 'protocol' && (
          <DailyProtocolRunner onExit={handleExitTask} />
        )}
        {activeRunningTask === 'dual_n_back' && (
          <DualNBackView
            initialN={taskOptions.nLevel ?? profile.baselines.dualNBackLevel ?? 2}
            onExit={handleExitTask}
          />
        )}
        {activeRunningTask === 'digit_span' && (
          <DigitSpanView
            initialMode={taskOptions.digitMode ?? 'forward'}
            onExit={handleExitTask}
          />
        )}
        {activeRunningTask === 'corsi_blocks' && (
          <CorsiView
            initialMode={taskOptions.corsiMode ?? 'forward'}
            onExit={handleExitTask}
          />
        )}
        {activeRunningTask === 'operation_span' && (
          <OSpanView onExit={handleExitTask} />
        )}
        {activeRunningTask === 'keep_track' && (
          <KeepTrackView
            initialTargetCount={taskOptions.targetCatCount}
            onExit={handleExitTask}
          />
        )}

        {/* Regular Tabs when not running a task */}
        {!activeRunningTask && (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard
                profile={profile}
                onStartProtocol={handleStartProtocol}
                onLaunchTask={handleLaunchTask}
              />
            )}
            {activeTab === 'sandbox' && (
              <SandboxView onLaunchCustomTask={handleLaunchCustomTask} />
            )}
            {activeTab === 'analytics' && <AnalyticsView />}
            {activeTab === 'about' && <AboutView />}
            {activeTab === 'settings' && <SettingsView />}
          </>
        )}
      </main>
    </div>
  );
};

export default App;

import { GlobalStyles } from './GlobalStyles';

import VideoCameraFrontIcon from '@mui/icons-material/VideoCameraFront';
import MenuIcon from '@mui/icons-material/Menu';

import Splitter from './components/Splitter/Splitter';
import MenuBar from './components/MenuBar/MenuBar';
import EpisodeManager from './components/EpisodeManager/EpisodeManager';
import MenuLabel from './components/MenuLabel/MenuLabel';
import PatientManager from './components/PatientManager/PatientManager';
import { Divider, IconButton, Menu, MenuItem } from '@mui/material';
import { useContext, useEffect, useState } from 'react';
import { DataContext } from './contexts/DataContext';
import ChatManager from './components/ChatManager/ChatManager';
import Generator from './utils/Generator';
import { Database } from "./Database";
import useEpisodes from './hooks/useEpisodes';
import { ChatMessage, Episode, IChatMessage } from './interfaces';
import { ConstructionOutlined } from '@mui/icons-material';

function App() {

  // UI state
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  // data state
  const { data, session, setData, setSession } = useContext(DataContext);

  const {
    episodes, episode: activeEpisode,
    setEpisodes, setEpisode: setActiveEpisode, setMessages, setParticipants
  } = useEpisodes(session);

  const [isBotChat, setIsBotChat] = useState(false);

  useEffect(() => {

    console.log('isBotChat', isBotChat, 'activeEpisode', !!activeEpisode)

    if (isBotChat && activeEpisode) {

      setTimeout(() => {
        console.log('Bot sending...');
        const other = activeEpisode!.participants.filter((p) => p.id !== session!.id);
        const newMessage = new ChatMessage({
          "datetime": new Date(),
          "message": Generator.getSentence(),
          "userId": other[0].id
        }, other[0]);
        setMessages([...activeEpisode.messages, newMessage]);
        console.log('Bot sending... end');
      }, Math.random() * 1000 + 300);

      setIsBotChat(false);
    }

  }, [isBotChat]);

  const handleLogIn = () => {
    setData(Generator.populateRandomData(Database));
    const doctor = data.users.find((user) => user.username === 'doctor')!;
    setSession(doctor);
  }

  const handleSendMessage = (message: string) => {
    if (session && activeEpisode) {
      const newMessage = new ChatMessage({
        "datetime": new Date(),
        "message": message,
        "userId": session.id
      }, session);
      setMessages([...activeEpisode.messages, newMessage]);

      setIsBotChat(true);
    }
  }

  const handleActivateEpisode = (episode: Episode) => {

    setActiveEpisode(episode);
  }

  if (!session) return (<button onClick={handleLogIn}>Login</button>)

  return (
    <div className="App">
      <GlobalStyles />
        <Splitter primaryIndex={1} secondaryInitialSize={260} secondaryMinSize={50}>
        <Splitter vertical primaryIndex={1} secondaryInitialSize={50} secondaryMinSize={20} percentage={true}>
          <ChatManager episodes={episodes!} activeEpisode={ activeEpisode ? activeEpisode : undefined } onActivateChatCard={(e) => handleActivateEpisode(e) }/>
              <Splitter vertical enabled={true} primaryIndex={0} secondaryInitialSize={50} secondaryMinSize={50}>
              <div>
                <MenuBar><VideoCameraFrontIcon /><MenuLabel>Appointments</MenuLabel></MenuBar>
              </div>
              <div>
                <MenuBar>
                  <VideoCameraFrontIcon /><MenuLabel>David Copperfield</MenuLabel>
                  <div className="align-right"><IconButton id="expand-menu-system" onClick={(e: React.MouseEvent<HTMLButtonElement>) => setAnchor(e.currentTarget) }><MenuIcon /></IconButton></div>
                </MenuBar>
                <Menu id="expand-menu-system" anchorEl={anchor} open={anchor?.id === "expand-menu-system"} onClose={() => setAnchor(null)}>
                  <MenuItem onClick={() => { }}>Profile</MenuItem>
                  <Divider />
                  <MenuItem onClick={() => {}}>Log Out</MenuItem>
                </Menu>
              </div>
              </Splitter>
            </Splitter>
            <Splitter primaryIndex={1} secondaryInitialSize={50} secondaryMinSize={30} percentage={true}>
          <PatientManager episode={activeEpisode ? activeEpisode : null} onSendMessage={ (e) => { handleSendMessage(e) }}/>
                <EpisodeManager />
            </Splitter>
        </Splitter>
    </div>
  );
}

export default App;

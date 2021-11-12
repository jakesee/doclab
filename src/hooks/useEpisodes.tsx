import { User, Episode, ChatMessage, IUser } from '../interfaces';
import { DataContext, IDataContext } from '../contexts/DataContext';
import { useContext, useEffect, useState } from 'react';

export const useEpisodes = (session: IUser | null) => {
  const { data } = useContext<IDataContext>(DataContext);
  const [episodes, setEpisodes] = useState<Episode[]>([]);

  const [episode, setEpisode] = useState<Episode>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<User[]>([]);

  useEffect(() => {
    if (episode) {
      const appointments = data.appointments.filter((a) => a.episodeId === episode?.id);
      const provider = data.providers.find((p) => p.id === episode?.providerId)!;

      episode.provider = provider;
      episode.appointments = appointments;
    }
  }, [episode])

  useEffect(() => {
    if (episode) {
      episode.messages = messages;

      TODO: message changes are not populated to all views

      }
    }, [messages])

  useEffect(() => {
    if (session?.id) {

      const getEpisodesByUser = (userId: number): Episode[] => {
        const userEpisodes = data.episodes.filter(episode => {
          return episode.participants.find((user) => user.id === userId) !== undefined;
        });

        const episodes: Episode[] = userEpisodes.map((episode) => {
          const participants = episode.participants.map((participant) => User.create(participant));
          const provider = data.providers.find((provider) => provider.id === episode.providerId)!;
          const appointments = data.appointments.filter((appt) => episode.id === appt.episodeId) ?? [];
          episode.participants = participants;
          return new Episode(episode, appointments, provider);
        });

        return episodes;
      }

      const userEpisodes = getEpisodesByUser(session.id);
      setEpisodes(userEpisodes);
      if(userEpisodes.length > 0) setEpisode(userEpisodes[0]);

    } else {
      setEpisodes([]);
    }
  }, [session]);

  return {
    episodes, episode,
    setEpisodes, setEpisode, setMessages, setParticipants
  };
}

export default useEpisodes;

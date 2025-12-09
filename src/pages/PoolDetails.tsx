import React, { useState, useEffect } from 'react';
import {
  IonContent,
  IonPage,
  IonList,
  IonItem,
  IonLabel,
  IonText,
  IonSpinner,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon,
  IonButton,
  useIonToast,
  IonSegment,
  IonSegmentButton,
  IonListHeader,
  IonTitle
} from '@ionic/react';
import { RouteComponentProps } from 'react-router-dom';
import { personAdd, refresh } from 'ionicons/icons';
import { API_ENDPOINTS, getFullUrl } from '../config/api';
import { cachedFetch } from '../utils/apiCache';

// Interfaces
interface Pool {
  id: number;
  name: string;
  description: string;
  invitationCode: number;
  maxParticipants: number;
  creatorId: number;
  currentParticipants?: number;
}

interface PoolParticipant {
  id: number;
  name: string;
  registeredAt: string;
}

interface Match {
  id: number;
  matchDate: string;
  homeTeamId: number;
  awayTeamId: number;
  status: string;
}

interface Team {
  id: number;
  name: string;
  logoUrl?: string;
}

interface Prediction {
  id: number;
  prediction: 'home' | 'away' | 'draw';
  userId: number;
  matchId: number;
  poolId: number;
}

interface LeaderboardPosition {
  userId: number;
  username: string;
  points: number;
  position: number;
}

interface RouteParams {
  id: string;
}

const PoolDetails: React.FC<RouteComponentProps<RouteParams>> = ({ match }) => {
  const poolId = parseInt(match.params.id);
  const [pool, setPool] = useState<Pool | null>(null);
  const [participants, setParticipants] = useState<PoolParticipant[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [userPredictions, setUserPredictions] = useState<Prediction[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardPosition[]>([]);
  const [teams, setTeams] = useState<Map<number, Team>>(new Map());
  const [view, setView] = useState(''); // Initial view state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [present] = useIonToast();
  const [userProfile, setUserProfile] = useState<{ id: number; } | null>(null);

  useEffect(() => {
    const profileStr = localStorage.getItem('userProfile');
    if (profileStr) {
      setUserProfile(JSON.parse(profileStr));
    }
  }, []);

  const currentUserId = userProfile?.id;
  const isCreator = pool?.creatorId === currentUserId;

  useEffect(() => {
    if (currentUserId) {
      fetchPoolAndAdditionalData();
    }
  }, [poolId, currentUserId]);

  useEffect(() => {
    if (view === 'ranking') {
      fetchLeaderboard();
    }
  }, [view]);

  const fetchPoolAndAdditionalData = async () => {
    try {
      setLoading(true);
      setError(null);
      setLeaderboard([]); // Reset leaderboard on reload

      const poolEndpoint = API_ENDPOINTS.POOL_BY_ID(poolId);
      const poolResponse = await cachedFetch(poolEndpoint);
      if (!poolResponse.ok) throw new Error(`Error al cargar la quiniela: ${poolResponse.statusText}`);
      const poolData = await poolResponse.json();
      const currentPool = poolData.data;
      setPool(currentPool);

      const isCreatorCheck = currentPool.creatorId === currentUserId;

      if (isCreatorCheck) {
        setView('participants'); // Default view for creator
        // Load participants for creator
        if (currentUserId) {
          const participantsEndpoint = API_ENDPOINTS.POOL_PARTICIPANTS_BY_USER(poolId, currentUserId);
          const participantsResponse = await cachedFetch(participantsEndpoint);
          if (participantsResponse.ok) {
            const participantsData = await participantsResponse.json();
            setParticipants(participantsData.data.participants || []);
          }
        }
      } else {
        setView('predictions'); // Default view for participant
      }

      // Load teams first
      const teamsEndpoint = API_ENDPOINTS.TEAMS;
      const teamsResponse = await cachedFetch(teamsEndpoint);
      if (teamsResponse.ok) {
        const teamsData = await teamsResponse.json();
        const teamsMap = new Map<number, Team>();
        (teamsData.data || []).forEach((team: Team) => teamsMap.set(team.id, team));
        setTeams(teamsMap);
      }

      // Load matches and predictions for EVERYONE (creator and participants)
      const matchesEndpoint = API_ENDPOINTS.MATCHES;
      const matchesResponse = await cachedFetch(matchesEndpoint);
      if (matchesResponse.ok) {
        const matchesData = await matchesResponse.json();
        setMatches((matchesData.data || []).filter((match: Match) => match.status !== 'finished'));
      }

      if (currentUserId) {
        const predictionsEndpoint = API_ENDPOINTS.PREDICTIONS_BY_USER(currentUserId!);
        const predictionsResponse = await cachedFetch(predictionsEndpoint);
        if (predictionsResponse.ok) {
          const predictionsData = await predictionsResponse.json();
          if (Array.isArray(predictionsData.data)) {
            // Filter all user predictions to get only the ones for the current pool
            setUserPredictions(predictionsData.data.filter((p: Prediction) => p.poolId === poolId));
          } else {
            console.warn('Predictions data is not an array:', predictionsData);
            setUserPredictions([]);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los detalles.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const endpoint = API_ENDPOINTS.LEADERBOARD_RANKING_BY_POOL(poolId);
      const response = await cachedFetch(endpoint);
      if (!response.ok) throw new Error('No se pudo cargar el ranking.');
      const data = await response.json();
      setLeaderboard(data.leaderboard.positions || []);
    } catch (err) {
      present({ message: (err as Error).message, duration: 3000, color: 'danger' });
    }
  };

  const handlePrediction = async (matchId: number, prediction: 'home' | 'away' | 'draw') => {
    if (!currentUserId) return;
    try {
      const response = await fetch(getFullUrl(API_ENDPOINTS.CREATE_PREDICTION), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prediction, userId: currentUserId, matchId, poolId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al enviar la predicción.');
      }
      const newPrediction = await response.json();
      setUserPredictions(prev => [...prev, newPrediction.data]);
      present({ message: 'Predicción guardada.', duration: 2000, color: 'success' });
    } catch (err) {
      present({ message: (err as Error).message, duration: 3000, color: 'danger' });
    }
  };

  const handleUpdateResults = async () => {
    try {
      const response = await fetch(getFullUrl(API_ENDPOINTS.UPDATE_ALL_LEADERBOARD), { method: 'POST' });
      if (!response.ok) throw new Error('Error al actualizar los resultados.');
      present({ message: 'Resultados actualizados.', duration: 2000, color: 'success' });
      if (view === 'ranking') fetchLeaderboard(); // Refresh ranking view
    } catch (err) {
      present({ message: (err as Error).message, duration: 3000, color: 'danger' });
    }
  };

  const copyInvitationCode = () => {
    if (pool?.invitationCode) {
      navigator.clipboard.writeText(pool.invitationCode.toString());
      present({ message: 'Código copiado.', duration: 2000, color: 'success' });
    }
  };

  const getUserPredictionForMatch = (matchId: number) => userPredictions.find(p => p.matchId === matchId);

  const getTeamName = (teamId: number) => teams.get(teamId)?.name || `Equipo ${teamId}`;

  if (loading) return <IonPage><IonContent className="ion-text-center ion-padding"><IonSpinner /></IonContent></IonPage>;
  if (error || !pool) return <IonPage><IonContent className="ion-text-center ion-padding"><IonText color="danger"><h3>Error</h3><p>{error || 'Quinela no encontrada'}</p></IonText></IonContent></IonPage>;

  const renderRanking = () => (
    <IonList>
      <IonListHeader><IonTitle>Ranking de la Quiniela</IonTitle></IonListHeader>
      {leaderboard.length > 0 ? leaderboard.map((pos) => (
        <IonItem key={pos.userId}>
          <IonLabel>
            <h2>{pos.position}. {pos.username}</h2>
            <p>{pos.points} Puntos</p>
          </IonLabel>
        </IonItem>
      )) : <IonItem><IonLabel className="ion-text-center">No hay datos de ranking aún.</IonLabel></IonItem>}
    </IonList>
  );

  return (
    <IonPage>
      <IonContent fullscreen>
        <div className="ion-padding">
          <IonText><h1>{pool.name}</h1></IonText>
        </div>

        <IonCard>
          <IonCardHeader><IonCardTitle>Información</IonCardTitle></IonCardHeader>
          <IonCardContent>
            <p>{pool.description}</p>
            <p><strong>Código:</strong> {pool.invitationCode}</p>
            {isCreator && <p><strong>Participantes:</strong> {participants.length}/{pool.maxParticipants}</p>}
          </IonCardContent>
        </IonCard>

        {isCreator ? (
          <>
            <IonSegment value={view} onIonChange={e => setView(String(e.detail.value))}>
              <IonSegmentButton value="participants"><IonLabel>Participantes</IonLabel></IonSegmentButton>
              <IonSegmentButton value="predictions"><IonLabel>Predecir</IonLabel></IonSegmentButton>
              <IonSegmentButton value="ranking"><IonLabel>Ranking</IonLabel></IonSegmentButton>
            </IonSegment>

            <div className="ion-padding">
              <IonButton expand="full" onClick={handleUpdateResults}><IonIcon slot="start" icon={refresh} />Actualizar Resultados</IonButton>
            </div>
            
            {view === 'participants' && (
              <IonList>
                <IonListHeader><IonTitle>Participantes ({participants.length})</IonTitle></IonListHeader>
                {participants.map((p) => (<IonItem key={p.id}><IonLabel><h3>{p.name}</h3><p>Unido: {new Date(p.registeredAt).toLocaleDateString()}</p></IonLabel></IonItem>))}
              </IonList>
            )}

            {view === 'predictions' && (
              <IonList>
                {matches.map((match) => {
                  const prediction = getUserPredictionForMatch(match.id);
                  return (
                    <IonCard key={match.id}>
                      <IonCardHeader><IonCardTitle className="ion-text-center">{getTeamName(match.homeTeamId)} vs {getTeamName(match.awayTeamId)}</IonCardTitle></IonCardHeader>
                      <IonCardContent>
                        <p className="ion-text-center">Fecha: {new Date(match.matchDate).toLocaleString()}</p>
                        <IonSegment value={prediction?.prediction} disabled={!!prediction} onIonChange={e => !prediction && handlePrediction(match.id, e.detail.value as any)}>
                          <IonSegmentButton value="home"><IonLabel>Local</IonLabel></IonSegmentButton>
                          <IonSegmentButton value="draw"><IonLabel>Empate</IonLabel></IonSegmentButton>
                          <IonSegmentButton value="away"><IonLabel>Visitante</IonLabel></IonSegmentButton>
                        </IonSegment>
                      </IonCardContent>
                    </IonCard>
                  );
                })}
              </IonList>
            )}

            {view === 'ranking' && renderRanking()}

            <div className="ion-padding">
              <IonButton expand="full" onClick={copyInvitationCode} color="secondary"><IonIcon slot="start" icon={personAdd} />Copiar Código</IonButton>
            </div>
          </>
        ) : (
          <>
            <IonSegment value={view} onIonChange={e => setView(e.detail.value?.toString() ?? '')}>
              <IonSegmentButton value="predictions"><IonLabel>Predecir</IonLabel></IonSegmentButton>
              <IonSegmentButton value="ranking"><IonLabel>Ranking</IonLabel></IonSegmentButton>
            </IonSegment>

            {view === 'predictions' && (
              <IonList>
                {matches.map((match) => {
                  const prediction = getUserPredictionForMatch(match.id);
                  return (
                    <IonCard key={match.id}>
                      <IonCardHeader><IonCardTitle className="ion-text-center">{getTeamName(match.homeTeamId)} vs {getTeamName(match.awayTeamId)}</IonCardTitle></IonCardHeader>
                      <IonCardContent>
                        <p className="ion-text-center">Fecha: {new Date(match.matchDate).toLocaleString()}</p>
                        <IonSegment value={prediction?.prediction} disabled={!!prediction} onIonChange={e => !prediction && handlePrediction(match.id, e.detail.value as any)}>
                          <IonSegmentButton value="home"><IonLabel>Local</IonLabel></IonSegmentButton>
                          <IonSegmentButton value="draw"><IonLabel>Empate</IonLabel></IonSegmentButton>
                          <IonSegmentButton value="away"><IonLabel>Visitante</IonLabel></IonSegmentButton>
                        </IonSegment>
                      </IonCardContent>
                    </IonCard>
                  );
                })}
              </IonList>
            )}

            {view === 'ranking' && renderRanking()}
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

// ✅ Export corregido
export default PoolDetails;

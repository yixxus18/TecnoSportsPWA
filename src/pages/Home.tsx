import {
  IonContent,
  IonPage,
  IonList,
  IonLabel,
  IonButton,
  useIonToast,
  IonIcon,
  useIonViewWillEnter,
  IonText,
  IonRefresher,
  IonRefresherContent,
} from "@ionic/react";
import { useState, useEffect } from "react";
import { bookmark, bookmarkOutline, refreshOutline, chevronDownCircleOutline } from "ionicons/icons";
import { API_ENDPOINTS } from "../config/api";
import { cachedFetch } from "../utils/apiCache";
import {
  requestNotificationPermissions,
  checkNotificationPermissions,
  scheduleMatchNotifications,
  cancelMatchNotifications,
  subscribeToWebPush,
} from "../lib/notifications";
import { addFavorite, removeFavorite, getFavorites } from "../lib/favorites";
import { useServiceWorkerUpdate } from "../hooks/useServiceWorkerUpdate";
import "./Home.css";

// Interfaces for type safety
interface Match {
  id: number;
  created_at: string;
  updated_at: string;
  weekNumber: number;
  scoreHome: number;
  scoreAway: number;
  status: string;
  matchDate: string;
  homeTeamId: number;
  awayTeamId: number;
}

interface FetchedTeam {
  id: number;
  name: string;
  logoUrl: string;
}

interface DisplayedMatch extends Match {
  homeTeam: FetchedTeam;
  awayTeam: FetchedTeam;
}

const SAVED_MATCHES_KEY = "savedMatches";
const DEFAULT_APP_ICON = "/favicon.png";

const Home: React.FC = () => {
  const [matches, setMatches] = useState<DisplayedMatch[]>([]);
  const [savedMatchIds, setSavedMatchIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [present] = useIonToast();
  const { needRefresh, acceptUpdate } = useServiceWorkerUpdate();

  // Función para manejar la suscripción VAPID
  const handlePushSubscription = async () => {
    const userProfileString = localStorage.getItem("userProfile");
    let userId: number | undefined;

    // Obtener el ID del usuario
    if (userProfileString) {
      try {
        const userProfile = JSON.parse(userProfileString);
        userId = userProfile.id;
      } catch (e) {
        console.error("Error parsing user profile", e);
        present({
          message: "Inicia sesión para suscribirte.",
          duration: 3000,
          color: "warning",
        });
        return;
      }
    }

    if (userId) {
      const success = await subscribeToWebPush(userId);
      if (success) {
        present({
          message: "¡Suscrito a las notificaciones Push de fondo!",
          duration: 3000,
          color: "success",
        });
      } else {
        present({
          message: "Error al suscribir. Revisa la consola y el Service Worker.",
          duration: 5000,
          color: "danger",
        });
      }
    }
  };

  // Función para cargar datos
  const loadData = async () => {
    try {
      setLoading(true);
      const teamsResponse = await cachedFetch(API_ENDPOINTS.TEAMS);
      if (!teamsResponse.ok) throw new Error("Error al cargar los equipos");
      const teamsResult = await teamsResponse.json();
      const teamsMap = new Map<number, FetchedTeam>();
      teamsResult.data.forEach((team: FetchedTeam) =>
        teamsMap.set(team.id, team)
      );

      const matchesResponse = await cachedFetch(API_ENDPOINTS.MATCHES);
      if (!matchesResponse.ok)
        throw new Error("Error al cargar los partidos");
      const matchesResult = await matchesResponse.json();
      const fetchedMatches: Match[] = matchesResult.data;

      const augmentedMatches: DisplayedMatch[] = fetchedMatches
        .filter((match) => match.status !== "finished")
        .map((match) => ({
          ...match,
          homeTeam: teamsMap.get(match.homeTeamId) || {
            id: match.homeTeamId,
            name: "Unknown Team",
            logoUrl: DEFAULT_APP_ICON,
          },
          awayTeam: teamsMap.get(match.awayTeamId) || {
            id: match.awayTeamId,
            name: "Unknown Team",
            logoUrl: DEFAULT_APP_ICON,
          },
        }));

      setMatches(augmentedMatches);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Ocurrió un error desconocido";
      present({ message: errorMessage, duration: 3000, color: "danger" });
    } finally {
      setLoading(false);
    }

    const userProfileString = localStorage.getItem("userProfile");
    let userId: number | undefined;
    if (userProfileString) {
      try {
        const userProfile = JSON.parse(userProfileString);
        userId = userProfile.id;
      } catch (e) {
        console.error("Error parsing user profile", e);
      }
    }

    if (userId) {
      try {
        const favorites = await getFavorites(userId);
        const favoriteIds = favorites.map((f) => f.matchId);
        setSavedMatchIds(favoriteIds);
        // Sync local storage
        localStorage.setItem(SAVED_MATCHES_KEY, JSON.stringify(favoriteIds));
      } catch (error) {
        console.error("Error fetching favorites from Supabase:", error);
        // Fallback to local storage
        const saved = localStorage.getItem(SAVED_MATCHES_KEY);
        if (saved) setSavedMatchIds(JSON.parse(saved));
      }
    } else {
      const saved = localStorage.getItem(SAVED_MATCHES_KEY);
      if (saved) setSavedMatchIds(JSON.parse(saved));
    }
  };

  // Función para manejar el pull-to-refresh
  const handleRefresh = async (event: CustomEvent) => {
    await loadData();
    event.detail.complete();
    present({ message: "Partidos actualizados", duration: 1500, color: "success" });
  };

  useEffect(() => {
    loadData();
  }, []);

  useIonViewWillEnter(() => {
    const saved = localStorage.getItem(SAVED_MATCHES_KEY);
    if (saved) setSavedMatchIds(JSON.parse(saved));
  });

  const handleToggleSaveMatch = async (match: DisplayedMatch) => {
    const userProfileString = localStorage.getItem("userProfile");
    let userId: number | undefined;
    if (userProfileString) {
      try {
        const userProfile = JSON.parse(userProfileString);
        userId = userProfile.id;
      } catch (e) {
        console.error("Error parsing user profile", e);
      }
    }

    const isMatchSaved = savedMatchIds.includes(match.id);

    if (isMatchSaved) {
      // Unsave the match
      const newSavedMatchIds = savedMatchIds.filter((id) => id !== match.id);
      setSavedMatchIds(newSavedMatchIds);
      localStorage.setItem(SAVED_MATCHES_KEY, JSON.stringify(newSavedMatchIds)); // Keep local sync for offline/speed

      // Remove from Supabase
      if (userId) {
        try {
          await removeFavorite(userId, match.id);
        } catch (error) {
          console.error("Error removing favorite from Supabase:", error);
          // Optionally revert state if it fails, but for now just log
        }
      }

      await cancelMatchNotifications(match.id);
      present({
        message: "Partido desguardado y notificaciones canceladas.",
        duration: 2000,
        color: "medium",
      });
    } else {
      // Save the match
      const newSavedMatchIds = [...savedMatchIds, match.id];
      setSavedMatchIds(newSavedMatchIds);
      localStorage.setItem(SAVED_MATCHES_KEY, JSON.stringify(newSavedMatchIds));

      // Save to Supabase
      if (userId) {
        try {
          await addFavorite(userId, match.id);
        } catch (error) {
          console.error("Error adding favorite to Supabase:", error);
          present({
            message: "Error al guardar en la nube, pero guardado localmente.",
            duration: 3000,
            color: "warning",
          });
        }
      } else {
        present({
          message: "Inicia sesión para guardar tus favoritos en la nube.",
          duration: 3000,
          color: "warning",
        });
      }

      // Handle notifications (Local + Permission request)
      try {
        let permission = await checkNotificationPermissions();

        if (permission === "prompt") {
          const granted = await requestNotificationPermissions();
          permission = granted ? "granted" : "denied";
        }

        if (permission === "granted") {
          const scheduled = await scheduleMatchNotifications({
            id: match.id,
            matchDate: match.matchDate,
            homeTeamName: match.homeTeam.name,
            awayTeamName: match.awayTeam.name,
          });
          if (scheduled) {
            present({
              message: "Partido guardado. Se te notificará antes y al empezar.",
              duration: 3000,
              color: "success",
            });
          } else {
            present({
              message: "Partido guardado. El partido ya ha comenzado.",
              duration: 3000,
              color: "medium",
            });
          }
        } else {
          present({
            message:
              "Partido guardado, pero las notificaciones están bloqueadas. Habilítalas en los ajustes de tu navegador.",
            duration: 5000,
            color: "warning",
          });
        }
      } catch (error) {
        console.error("Error handling notifications:", error);
        present({
          message: "Ocurrió un error al configurar las notificaciones.",
          duration: 4000,
          color: "danger",
        });
      }
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen>
        {/* Pull to Refresh */}
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent
            pullingIcon={chevronDownCircleOutline}
            pullingText="Desliza para actualizar"
            refreshingSpinner="circles"
            refreshingText="Actualizando..."
          />
        </IonRefresher>
        <div className="ion-padding">
          {/* Botón para actualizar la PWA */}
          {needRefresh && (
            <IonButton expand="block" onClick={acceptUpdate} color="warning" className="ion-margin-bottom">
              <IonIcon slot="start" icon={refreshOutline} />
              Nueva versión disponible - Actualizar
            </IonButton>
          )}
          {/* Botón añadido para activar Web Push */}
          <IonButton expand="block" onClick={handlePushSubscription} color="secondary">
            Activar Notificaciones de Fondo
          </IonButton>
        </div>
        {loading ? (
          <div className="ion-text-center ion-padding">
            <IonText>
              <h3>Cargando partidos...</h3>
              <p>Por favor espera un momento</p>
            </IonText>
          </div>
        ) : matches.length > 0 ? (
          <IonList>
            {matches.map((match) => (
              <div key={match.id} className="match-card">
                <div className="match-header">
                  <h3 className="ion-text-center">
                    {new Date(match.matchDate).toLocaleDateString("es-ES", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </h3>
                </div>
                <div className="match-content">
                  <div className="teams-container">
                    <div className="team">
                      <img
                        src={match.homeTeam.logoUrl}
                        alt={match.homeTeam.name}
                      />
                      <IonLabel>{match.homeTeam.name}</IonLabel>
                    </div>
                    <div className="vs-label">VS</div>
                    <div className="team">
                      <img
                        src={match.awayTeam.logoUrl}
                        alt={match.awayTeam.name}
                      />
                      <IonLabel>{match.awayTeam.name}</IonLabel>
                    </div>
                  </div>
                  <div className="ion-text-right">
                    <IonButton
                      fill="clear"
                      className={`favorite-button ${
                        savedMatchIds.includes(match.id) ? "favorited" : ""
                      }`}
                      onClick={() => handleToggleSaveMatch(match)}
                    >
                      <IonIcon
                        slot="icon-only"
                        icon={
                          savedMatchIds.includes(match.id)
                            ? bookmark
                            : bookmarkOutline
                        }
                      />
                    </IonButton>
                  </div>
                </div>
              </div>
            ))}
          </IonList>
        ) : (
          <div className="ion-text-center ion-padding">
            <IonText>
              <h3>No hay partidos disponibles</h3>
              <p>
                Los partidos se cargarán automáticamente cuando estén
                disponibles
              </p>
            </IonText>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Home;

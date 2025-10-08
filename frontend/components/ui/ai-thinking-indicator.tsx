import { Audio } from "expo-av";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemedText } from "../themed-text";

import { UserPreferences } from "@/constants/user-preferences";

const SYMBOLS = ["α", "β", "λ", "ϕ", "∑", "Ω", "∞", "Ψ", "π", "Δ", "∂", "µ", "ξ", "χ", "Θ", "γ", "ζ", "ρ", "η", "σ"];
const COLORS = ["#1E3A5F", "#2E5A7F", "#3B6B99", "#1A4566", "#2C5C80"];

export default function AiThinkingIndicator() {
  const [chars, setChars] = useState<string[]>([]);
  const [colorIndex, setColorIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const soundRef = useRef<Audio.Sound | null>(null);

  // Update characters continuously
  useEffect(() => {
    const interval = setInterval(() => {
      setChars((prev) => {
        const next = [...prev];
        if (next.length > 15) next.shift();
        next.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
        return next;
      });
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // Pulse animation (fade + scale)
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0.6,
            duration: 600,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1.15,
            duration: 600,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [fadeAnim, scaleAnim]);

  // Color cycling
  useEffect(() => {
    const colorCycle = setInterval(() => {
      setColorIndex((prev) => (prev + 1) % COLORS.length);
    }, 1000);
    return () => clearInterval(colorCycle);
  }, []);

  // Optional: ambient hum
  useEffect(() => {
    let isMounted = true; // optional safety flag
    let sound: Audio.Sound;

    // Async setup
    const loadSound = async () => {
      try {
        const allowSound = await AsyncStorage.getItem(UserPreferences.ai_thinking_sound);
        if ((allowSound ?? "true") === "true") {
          const { sound: s } = await Audio.Sound.createAsync(
            require("../../assets/ai-thinking.mp3"),
            { isLooping: true, volume: 0.4 }
          );
          sound = s;
          if (isMounted) {
            await sound.playAsync();
          }
          soundRef.current = sound;
        }
      } catch (e) {
        console.warn("Error loading AI thinking sound:", e);
      }
    };

    loadSound();

    // Cleanup
    return () => {
      isMounted = false;
      if (sound) {
        sound.stopAsync().catch(() => { });  // prevent unhandled promise rejection
        sound.unloadAsync().catch(() => { });
      }
    };
  }, []);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <ThemedText
        type="subtitle"
        style={{
          marginTop: 15,
          marginBottom: 15,
          textAlign: 'center',
        }}>
        Thinking
      </ThemedText>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          paddingVertical: 10,
        }}
      >
        {chars.map((c, i) => (
          <Animated.Text
            key={i}
            style={{
              fontSize: 22,
              fontWeight: "700",
              marginHorizontal: 2,
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
              color: COLORS[(colorIndex + i) % COLORS.length],
              textShadowColor: COLORS[(colorIndex + i) % COLORS.length],
              textShadowRadius: 10,
            }}
          >
            {c}
          </Animated.Text>
        ))}
      </View>
    </View>
  );
}
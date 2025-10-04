import { useThemeColor } from "@/hooks/use-theme-color";
import { View } from "react-native";

export function VerticalThemedSeparator({ style }: { style?: any }) {
  const borderColor = useThemeColor({}, "border");
  return (
    <View
      style={[
        {
          width: 1.5,
          backgroundColor: borderColor + '80', // 50% opacity
          marginVertical: 18,
          borderRadius: 1,
        },
        style,
      ]}
    />
  );
}

export function HorizontalThemedSeparator({ style }: { style?: any }) {
  const borderColor = useThemeColor({}, "border");
  return (
    <View
      style={[
        {
          height: 1.5,
          backgroundColor: borderColor + '80', // 50% opacity
          marginVertical: 18,
          borderRadius: 1,
        },
        style,
      ]}
    />
  );
}
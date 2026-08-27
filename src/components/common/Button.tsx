import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from "react-native";
import { THEME } from "../../config/constants";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "outline";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const getBackgroundColor = () => {
    if (disabled) return THEME.colors.surfaceElevated;
    switch (variant) {
      case "primary":
        return THEME.colors.primary;
      case "secondary":
        return THEME.colors.surfaceElevated;
      case "danger":
        return THEME.colors.danger;
      case "outline":
        return "transparent";
      default:
        return THEME.colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return THEME.colors.textSubtle;
    switch (variant) {
      case "primary":
        return "#080B11";
      case "secondary":
        return THEME.colors.text;
      case "danger":
        return "#FFFFFF";
      case "outline":
        return THEME.colors.primary;
      default:
        return "#080B11";
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.button,
        { backgroundColor: getBackgroundColor() },
        variant === "outline" && {
          borderColor: disabled ? THEME.colors.border : THEME.colors.primary,
          borderWidth: 1.5,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              { color: getTextColor(), marginLeft: icon ? THEME.spacing.sm : 0 },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: THEME.borderRadius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: THEME.spacing.lg,
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
  },
});

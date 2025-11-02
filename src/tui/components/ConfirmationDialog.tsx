import { Box, Text } from "ink";
import { ConfirmInput } from "@inkjs/ui";
import React from "react";

interface ConfirmationDialogProps {
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * ConfirmationDialog shows a Y/n prompt for user confirmation
 * Used for session rejection and other destructive actions
 */
export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  message,
  onCancel,
  onConfirm,
}) => {
  return (
    <Box
      borderColor="yellow"
      borderStyle="single"
      flexDirection="column"
      padding={1}
    >
      <Box marginBottom={1}>
        <Text bold color="yellow">
          {message}
        </Text>
      </Box>
      <Box>
        <ConfirmInput onCancel={onCancel} onConfirm={onConfirm} />
      </Box>
    </Box>
  );
};

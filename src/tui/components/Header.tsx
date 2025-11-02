import { Box, Text } from "ink";
import React from "react";

import { welcomeText } from "../utils/gradientText.js";

interface HeaderProps {
	pendingCount: number;
}

/**
 * Header component - displays app logo and status
 * Shows at the top of the TUI with gradient branding and pending queue count
 */
export const Header: React.FC<HeaderProps> = ({ pendingCount }) => {
	return (
		<Box
			borderColor="cyan"
			borderStyle="single"
			flexDirection="row"
			justifyContent="space-between"
			paddingX={1}
		>
			<Text>{welcomeText("🤖 AUQ - Ask User Questions MCP")}</Text>
			<Box>
				<Text dimColor>│</Text>
				<Text color={pendingCount > 0 ? "yellow" : "green"}>
					{" "}
					{pendingCount} more on queue
				</Text>
			</Box>
		</Box>
	);
};

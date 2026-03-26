import { test, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MainContent } from "@/app/main-content";

// Mock all heavy dependencies so we can isolate the toggle logic
vi.mock("@/lib/contexts/file-system-context", () => ({
  FileSystemProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useFileSystem: () => ({
    fileSystem: { serialize: () => ({}) },
    handleToolCall: vi.fn(),
    refreshTrigger: 0,
    selectedFile: null,
    setSelectedFile: vi.fn(),
  }),
}));

vi.mock("@/lib/contexts/chat-context", () => ({
  ChatProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useChat: () => ({ messages: [], input: "", handleSubmit: vi.fn(), handleInputChange: vi.fn(), isLoading: false }),
}));

vi.mock("@/components/chat/ChatInterface", () => ({
  ChatInterface: () => <div data-testid="chat-interface">Chat</div>,
}));

vi.mock("@/components/editor/FileTree", () => ({
  FileTree: () => <div data-testid="file-tree">FileTree</div>,
}));

vi.mock("@/components/editor/CodeEditor", () => ({
  CodeEditor: () => <div data-testid="code-editor">CodeEditor</div>,
}));

vi.mock("@/components/preview/PreviewFrame", () => ({
  PreviewFrame: () => <div data-testid="preview-frame">PreviewFrame</div>,
}));

vi.mock("@/components/HeaderActions", () => ({
  HeaderActions: () => <div data-testid="header-actions">HeaderActions</div>,
}));

vi.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children, ...props }: any) => (
    <div data-testid="resizable-group" {...props}>{children}</div>
  ),
  ResizablePanel: ({ children, ...props }: any) => (
    <div data-testid="resizable-panel" {...props}>{children}</div>
  ),
  ResizableHandle: () => <div data-testid="resizable-handle" />,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test("renders Preview tab as active by default", () => {
  render(<MainContent />);
  const previewTab = screen.getByRole("tab", { name: "Preview" });
  const codeTab = screen.getByRole("tab", { name: "Code" });
  expect(previewTab).toHaveAttribute("data-state", "active");
  expect(codeTab).toHaveAttribute("data-state", "inactive");
});

test("shows PreviewFrame by default", () => {
  render(<MainContent />);
  expect(screen.getByTestId("preview-frame")).toBeTruthy();
  expect(screen.queryByTestId("code-editor")).toBeNull();
});

test("switches to code view when Code tab is clicked", () => {
  render(<MainContent />);
  const codeTab = screen.getByRole("tab", { name: "Code" });
  fireEvent.click(codeTab);
  expect(screen.getByTestId("code-editor")).toBeTruthy();
  expect(screen.queryByTestId("preview-frame")).toBeNull();
});

test("Code tab becomes active after clicking it", () => {
  render(<MainContent />);
  const codeTab = screen.getByRole("tab", { name: "Code" });
  const previewTab = screen.getByRole("tab", { name: "Preview" });
  fireEvent.click(codeTab);
  expect(codeTab).toHaveAttribute("data-state", "active");
  expect(previewTab).toHaveAttribute("data-state", "inactive");
});

test("switches back to preview when Preview tab is clicked after switching to code", () => {
  render(<MainContent />);
  const codeTab = screen.getByRole("tab", { name: "Code" });
  const previewTab = screen.getByRole("tab", { name: "Preview" });

  // Switch to code
  fireEvent.click(codeTab);
  expect(screen.getByTestId("code-editor")).toBeTruthy();
  expect(screen.queryByTestId("preview-frame")).toBeNull();

  // Switch back to preview
  fireEvent.click(previewTab);
  expect(screen.getByTestId("preview-frame")).toBeTruthy();
  expect(screen.queryByTestId("code-editor")).toBeNull();
});

test("clicking Preview tab when already on preview does not break anything", () => {
  render(<MainContent />);
  const previewTab = screen.getByRole("tab", { name: "Preview" });
  fireEvent.click(previewTab);
  expect(screen.getByTestId("preview-frame")).toBeTruthy();
  expect(previewTab).toHaveAttribute("data-state", "active");
});

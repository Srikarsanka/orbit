import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Language {
      id: string;
      name: string;
      icon: string;
}

interface ExecutionResult {
      success: boolean;
      output: string;
      error: string | null;
      executionTime: number;
}

interface HistoryItem {
      language: string;
      code: string;
      timestamp: Date;
      success: boolean;
      output: string;
}

@Component({
      selector: 'app-compiler',
      templateUrl: './compiler.html',
      styleUrls: ['./compiler.css'],
      standalone: true,
      imports: [HttpClientModule, CommonModule, FormsModule]
})
export class Compiler implements OnInit {
      // Language selection
      languages: Language[] = [];
      selectedLanguage: string = 'python';

      // Code editor
      code: string = '';

      // Execution state
      isExecuting: boolean = false;
      output: string = '';
      error: string = '';
      hasError: boolean = false;
      lastExecutionTime: number | null = null;

      // AI suggestions
      aiSuggestion: string = '';
      suggestedCode: string = '';

      // History
      executionHistory: HistoryItem[] = [];
      showHistory: boolean = false;

      // Code templates
      private templates: { [key: string]: string } = {
            python: `# Python Code
print("Hello, World!")

# Try some math
x = 10
y = 20
print(f"Sum: {x + y}")`,

            java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
        
        // Try some math
        int x = 10;
        int y = 20;
        System.out.println("Sum: " + (x + y));
    }
}`,

            c: `#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    
    // Try some math
    int x = 10;
    int y = 20;
    printf("Sum: %d\\n", x + y);
    
    return 0;
}`,

            cpp: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    
    // Try some math
    int x = 10;
    int y = 20;
    cout << "Sum: " << (x + y) << endl;
    
    return 0;
}`
      };

      constructor(private http: HttpClient) { }

      ngOnInit() {
            this.loadLanguages();
            this.loadHistoryFromStorage();
            this.code = this.templates[this.selectedLanguage];
      }

      async loadLanguages() {
            try {
                  const res: any = await this.http.get('http://localhost:8000/api/compiler/languages').toPromise();
                  this.languages = res.languages;
            } catch (error) {
                  console.error('Failed to load languages:', error);
                  // Fallback
                  this.languages = [
                        { id: 'python', name: 'Python', icon: '🐍' },
                        { id: 'java', name: 'Java', icon: '☕' },
                        { id: 'c', name: 'C', icon: '🔧' },
                        { id: 'cpp', name: 'C++', icon: '⚙️' }
                  ];
            }
      }

      onLanguageChange() {
            // Load template for selected language
            if (this.templates[this.selectedLanguage]) {
                  this.code = this.templates[this.selectedLanguage];
            }
            this.clearOutput();
      }

      async runCode() {
            if (!this.code.trim()) {
                  this.error = 'Please write some code first!';
                  this.hasError = true;
                  return;
            }

            this.isExecuting = true;
            this.clearOutput();

            try {
                  const res: any = await this.http.post('http://localhost:8000/api/compiler/execute', {
                        language: this.selectedLanguage,
                        code: this.code,
                        input: ''
                  }).toPromise();

                  this.isExecuting = false;
                  this.lastExecutionTime = res.executionTime;

                  if (res.success) {
                        this.output = res.output || '(No output)';
                        this.hasError = false;
                        this.aiSuggestion = '';
                  } else {
                        this.error = res.error || 'Unknown error occurred';
                        this.hasError = true;
                        // Get AI suggestion for error
                        await this.getAISuggestion(res.error);
                  }

                  // Save to history
                  this.addToHistory(res.success, res.output || res.error);

            } catch (error: any) {
                  this.isExecuting = false;
                  this.error = error.error?.error || 'Failed to execute code. Server error.';
                  this.hasError = true;
            }
      }

      stopExecution() {
            // In a real implementation, this would cancel the HTTP request
            this.isExecuting = false;
      }

      async getAISuggestion(errorMessage: string) {
            // Placeholder for AI suggestion
            // In production, this would call Gemini API
            this.aiSuggestion = this.generateSimpleSuggestion(errorMessage);
      }

      generateSimpleSuggestion(error: string): string {
            // Simple rule-based suggestions
            if (error.includes('SyntaxError')) {
                  return '💡 Syntax Error detected. Check for missing parentheses, brackets, or semicolons.';
            } else if (error.includes('NameError') || error.includes('undefined')) {
                  return '💡 Variable not defined. Make sure you\'ve declared all variables before using them.';
            } else if (error.includes('IndentationError')) {
                  return '💡 Indentation Error. Python requires consistent indentation (use 4 spaces).';
            } else if (error.includes('TypeError')) {
                  return '💡 Type Error. Check if you\'re using the correct data types in operations.';
            } else if (error.includes('timeout')) {
                  return '💡 Execution timeout. Your code might have an infinite loop or is taking too long.';
            } else if (error.includes('Compilation Error')) {
                  return '💡 Compilation failed. Check your syntax and make sure all statements are correct.';
            }
            return '💡 An error occurred. Review your code and try again.';
      }

      applySuggestion() {
            if (this.suggestedCode) {
                  this.code = this.suggestedCode;
                  this.aiSuggestion = '';
                  this.suggestedCode = '';
            }
      }

      clearCode() {
            this.code = '';
            this.clearOutput();
      }

      clearOutput() {
            this.output = '';
            this.error = '';
            this.hasError = false;
            this.aiSuggestion = '';
            this.lastExecutionTime = null;
      }

      downloadCode() {
            const ext = this.getFileExtension();
            const blob = new Blob([this.code], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `code.${ext}`;
            a.click();
            window.URL.revokeObjectURL(url);
      }

      downloadOutput() {
            const content = this.output || this.error || 'No output';
            const blob = new Blob([content], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'output.txt';
            a.click();
            window.URL.revokeObjectURL(url);
      }

      getFileExtension(): string {
            const extensions: { [key: string]: string } = {
                  python: 'py',
                  java: 'java',
                  c: 'c',
                  cpp: 'cpp'
            };
            return extensions[this.selectedLanguage] || 'txt';
      }

      getPlaceholder(): string {
            return `Write your ${this.selectedLanguage} code here...`;
      }

      // History management
      addToHistory(success: boolean, output: string) {
            const item: HistoryItem = {
                  language: this.selectedLanguage,
                  code: this.code,
                  timestamp: new Date(),
                  success: success,
                  output: output
            };

            this.executionHistory.unshift(item);

            // Keep only last 20 items
            if (this.executionHistory.length > 20) {
                  this.executionHistory = this.executionHistory.slice(0, 20);
            }

            this.saveHistoryToStorage();
      }

      loadHistoryItem(item: HistoryItem) {
            this.selectedLanguage = item.language;
            this.code = item.code;
            this.showHistory = false;
      }

      toggleHistory() {
            this.showHistory = !this.showHistory;
      }

      saveHistoryToStorage() {
            try {
                  localStorage.setItem('compiler_history', JSON.stringify(this.executionHistory));
            } catch (e) {
                  console.error('Failed to save history:', e);
            }
      }

      loadHistoryFromStorage() {
            try {
                  const stored = localStorage.getItem('compiler_history');
                  if (stored) {
                        this.executionHistory = JSON.parse(stored);
                        // Convert timestamp strings back to Date objects
                        this.executionHistory.forEach(item => {
                              item.timestamp = new Date(item.timestamp);
                        });
                  }
            } catch (e) {
                  console.error('Failed to load history:', e);
            }
      }
}

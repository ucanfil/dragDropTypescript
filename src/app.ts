interface IValidatable {
    value: string | number;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
}

interface IProject extends IProjectProps {
    id: string;
    completed: boolean;
}

interface IProjectProps {
    title: string;
    people: number;
    description?: string;
}

enum ProjectStatus {
    Active = "active",
    Finished = "finished",
}

function validate(validatableInput: IValidatable) {
    let isValid = true;

    if (validatableInput.required) {
        isValid =
            isValid && validatableInput.value.toString().trim().length !== 0;
    }

    if (
        validatableInput.minLength != null &&
        typeof validatableInput.value === "string"
    ) {
        isValid =
            isValid &&
            validatableInput.value.trim().length >= validatableInput.minLength;
    }

    if (
        validatableInput.maxLength != null &&
        typeof validatableInput.value === "string"
    ) {
        isValid =
            isValid &&
            validatableInput.value.trim().length <= validatableInput.maxLength;
    }

    if (
        validatableInput.min != null &&
        typeof validatableInput.value === "number"
    ) {
        isValid = isValid && validatableInput.value >= validatableInput.min;
    }

    if (
        validatableInput.max != null &&
        typeof validatableInput.value === "number"
    ) {
        isValid = isValid && validatableInput.value <= validatableInput.max;
    }

    return isValid;
}

function autobind(
    _: any,
    __: string,
    descriptor: PropertyDescriptor,
): PropertyDescriptor {
    const originalMethod = descriptor.value;

    return {
        configurable: true,
        get() {
            return originalMethod.bind(this);
        },
    };
}

type listenerFn<T> = (projects: T[]) => void;

abstract class State<T> {
    protected listeners: listenerFn<T>[] = [];

    addListener(listener: listenerFn<T>) {
        this.listeners.push(listener);
    }
}

class ProjectState extends State<IProject> {
    private static instance: ProjectState;
    public projects: IProject[] = [];

    constructor() {
        super();
    }

    public static getInstance(): ProjectState {
        if (!ProjectState.instance) {
            ProjectState.instance = new ProjectState();
        }

        return ProjectState.instance;
    }

    addProject(props: IProjectProps) {
        const { title, people, description } = props;
        const project = new Project(title, people, description);
        this.projects.push(project.get());

        for (const listener of this.listeners) {
            listener(this.projects.slice());
        }
    }
}

abstract class Component<T extends HTMLElement, U extends HTMLDivElement> {
    private template: HTMLTemplateElement;
    protected element: T;
    private app: U;

    constructor(
        templateId: string,
        targetId: string,
        insertPosition: InsertPosition,
        elementId?: string,
    ) {
        this.template = document.getElementById(
            templateId,
        )! as HTMLTemplateElement;
        this.app = document.getElementById(targetId)! as U;
        const clone = this.template.content.cloneNode(true)! as T;
        this.element = clone.firstElementChild! as T;

        if (elementId) {
            this.element.id = elementId;
        }

        this.attach(insertPosition, this.element);
    }

    private attach(position: InsertPosition, element: HTMLElement): void {
        this.app.insertAdjacentElement(position, element);
    }

    protected abstract configure(): void;
    protected abstract renderContent(): void;
}

class ProjectList extends Component<HTMLElement, HTMLDivElement> {
    private container: HTMLUListElement;
    private assignedProjects: IProject[];

    constructor(private type: ProjectStatus) {
        super("project-list", "app", "beforeend", `${type}-projects`);
        this.assignedProjects = [];

        this.container = this.element.querySelector(
            `#${this.type}-projects ul`,
        )! as HTMLUListElement;

        this.element.querySelector("header h2")!.textContent = `${
            this.type === ProjectStatus.Active
                ? "Active projects"
                : "Finished projects"
        }`;

        this.configure();
    }

    protected configure() {
        ProjectState.getInstance().addListener((projects) => {
            this.assignedProjects = projects;
            this.renderContent();
        });
    }

    protected renderContent() {
        this.container.innerHTML = "";

        const filteredProjects = this.assignedProjects.filter((project) =>
            this.type === ProjectStatus.Active
                ? !project.completed
                : project.completed,
        );

        filteredProjects.forEach((project) => {
            const singleProject = document.createElement("li");
            singleProject.textContent = project.title;
            this.container.appendChild(singleProject);
        });
    }
}

class ProjectInput extends Component<HTMLFormElement, HTMLDivElement> {
    private titleInput: HTMLInputElement;
    private descriptionInput: HTMLInputElement;
    private peopleInput: HTMLInputElement;

    constructor() {
        super("project-input", "app", "afterbegin", "user-input");
        this.titleInput = this.element.querySelector(
            "#title",
        )! as HTMLInputElement;
        this.descriptionInput = this.element.querySelector(
            "#description",
        )! as HTMLInputElement;
        this.peopleInput = this.element.querySelector(
            "#people",
        )! as HTMLInputElement;

        this.configure();
    }

    protected configure() {
        this.element.addEventListener("submit", this.submitHandler);
    }

    protected renderContent() {}

    private getProjectValues(): [string, string, number] | void {
        const enteredTitleInput = this.titleInput.value;
        const enteredDescriptionInput = this.descriptionInput.value;
        const enteredPeopleInput = this.peopleInput.value;

        const titleValue: IValidatable = {
            value: enteredTitleInput,
            required: true,
        };

        const descriptionValue: IValidatable = {
            value: enteredDescriptionInput,
            required: false,
            minLength: 5,
        };

        const peopleValue: IValidatable = {
            value: +enteredPeopleInput,
            required: true,
            min: 1,
            max: 5,
        };

        if (
            !validate(titleValue) ||
            !validate(descriptionValue) ||
            !validate(peopleValue)
        ) {
            alert("Invalid input/s");
            return;
        } else {
            return [
                enteredTitleInput,
                enteredDescriptionInput,
                parseInt(enteredPeopleInput),
            ];
        }
    }

    @autobind
    private submitHandler(event: Event) {
        event.preventDefault();

        const enteredInputs = this.getProjectValues();
        if (Array.isArray(enteredInputs)) {
            const [title, description, people] = enteredInputs;
            ProjectState.getInstance().addProject({
                title,
                people,
                description,
            });

            console.log(ProjectState.getInstance().projects);
        }
    }
}

class Project {
    private id: string;
    private completed = false;

    constructor(
        private title: string,
        private people: number,
        private description?: string,
    ) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.title = title;
        this.description = description ?? "";
        this.people = people;
    }

    public get(): IProject {
        return {
            id: this.id,
            completed: this.completed,
            title: this.title,
            description: this.description,
            people: this.people,
        };
    }
}

const projectInput = new ProjectInput();
const projectListActive = new ProjectList(ProjectStatus.Active);
const projectListFinished = new ProjectList(ProjectStatus.Finished);
